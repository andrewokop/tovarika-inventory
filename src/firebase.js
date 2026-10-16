import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getFirestore, onSnapshot, orderBy, query, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);
let auth;
let db;
if (firebaseConfigured) {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export const observeUser = callback => firebaseConfigured ? onAuthStateChanged(auth, callback) : () => callback(null);
export const loginWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logout = () => signOut(auth);

export const subscribeToStore = (uid, onData, onError) => {
  let products = [];
  let transactions = [];
  let productsReady = false;
  let transactionsReady = false;
  const emit = () => { if (productsReady && transactionsReady) onData({ products, transactions }); };
  const productQuery = query(collection(db, 'users', uid, 'products'), orderBy('createdAt', 'desc'));
  const movementQuery = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'));
  const stopProducts = onSnapshot(productQuery, snapshot => {
    products = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    productsReady = true;
    emit();
  }, onError);
  const stopTransactions = onSnapshot(movementQuery, snapshot => {
    transactions = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    transactionsReady = true;
    emit();
  }, onError);
  return () => { stopProducts(); stopTransactions(); };
};

export const createProduct = async (uid, product) => {
  const batch = writeBatch(db);
  const productRef = doc(collection(db, 'users', uid, 'products'));
  batch.set(productRef, { ...product, schemaVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  if (product.stock > 0) {
    const movementRef = doc(collection(db, 'users', uid, 'transactions'));
    batch.set(movementRef, { type: 'purchase', title: `Начальный остаток · ${product.name}`, productId: productRef.id, productName: product.name, date: new Date().toISOString(), qty: product.stock, amount: product.cost * product.stock, unitCost: product.cost, unitPrice: product.price, note: 'Начальный остаток', schemaVersion: 1, createdAt: serverTimestamp() });
  }
  await batch.commit();
  return productRef.id;
};

export const updateProduct = (uid, productId, product) => import('firebase/firestore').then(({ updateDoc }) => updateDoc(doc(db, 'users', uid, 'products', productId), { ...product, updatedAt: serverTimestamp() }));

export const createMovement = (uid, productId, type, qty, date = new Date().toISOString(), note = '') => runTransaction(db, async transaction => {
  const productRef = doc(db, 'users', uid, 'products', productId);
  const productSnapshot = await transaction.get(productRef);
  if (!productSnapshot.exists()) throw new Error('Товар не найден. Обновите страницу.');
  const product = productSnapshot.data();
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Количество должно быть целым числом больше нуля.');
  if (type === 'sale' && qty > Number(product.stock || 0)) throw new Error('Недостаточный остаток товара на складе.');
  const isSale = type === 'sale';
  const amount = (isSale ? Number(product.price) : Number(product.cost)) * qty;
  transaction.update(productRef, { stock: Number(product.stock || 0) + (isSale ? -qty : qty), sold: Number(product.sold || 0) + (isSale ? qty : 0), updatedAt: serverTimestamp() });
  const movementRef = doc(collection(db, 'users', uid, 'transactions'));
  transaction.set(movementRef, { type, title: `${isSale ? 'Продажа' : 'Поступление'} · ${product.name}`, productId, productName: product.name, date, qty, amount, unitCost: Number(product.cost), unitPrice: Number(product.price), note, schemaVersion: 1, createdAt: serverTimestamp() });
});
