import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';

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
  const stopProducts = onSnapshot(collection(db, 'users', uid, 'products'), snapshot => {
    products = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    productsReady = true;
    emit();
  }, onError);
  const stopTransactions = onSnapshot(collection(db, 'users', uid, 'transactions'), snapshot => {
    transactions = snapshot.docs.map(item => ({ ...item.data(), id: item.id })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    transactionsReady = true;
    emit();
  }, onError);
  return () => { stopProducts(); stopTransactions(); };
};
export const createProduct = async (uid, product) => {
  const batch = writeBatch(db);
  const productRef = doc(collection(db, 'users', uid, 'products'));
  batch.set(productRef, { ...product, createdAt: serverTimestamp() });
  if (product.stock > 0) {
    const movementRef = doc(collection(db, 'users', uid, 'transactions'));
    batch.set(movementRef, { type: 'purchase', title: `Начальный остаток · ${product.name}`, productId: productRef.id, productName: product.name, date: new Date().toISOString(), qty: product.stock, amount: product.cost * product.stock, unitCost: product.cost, unitPrice: product.price, createdAt: serverTimestamp() });
  }
  await batch.commit();
};
export const createMovement = (uid, productId, type, qty) => runTransaction(db, async transaction => {
  const productRef = doc(db, 'users', uid, 'products', productId);
  const productSnapshot = await transaction.get(productRef);
  if (!productSnapshot.exists()) throw new Error('Товар не найден. Обновите страницу.');
  const product = productSnapshot.data();
  if (type === 'sale' && qty > product.stock) throw new Error('Недостаточный остаток товара на складе.');
  const isSale = type === 'sale';
  const amount = (isSale ? product.price : product.cost) * qty;
  transaction.update(productRef, { stock: product.stock + (isSale ? -qty : qty), sold: (product.sold || 0) + (isSale ? qty : 0) });
  const movementRef = doc(collection(db, 'users', uid, 'transactions'));
  transaction.set(movementRef, {
    type,
    title: `${isSale ? 'Продажа' : 'Поступление'} · ${product.name}`,
    productId,
    productName: product.name,
    date: new Date().toISOString(),
    qty,
    amount,
    unitCost: product.cost,
    unitPrice: product.price,
    createdAt: serverTimestamp(),
  });
});
