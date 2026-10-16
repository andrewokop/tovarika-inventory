import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Archive, ArrowDownLeft, ArrowUpRight, BadgeRussianRuble, Boxes, CalendarDays, ChartNoAxesCombined, ChevronDown, CircleHelp, Download, LayoutDashboard, LogOut, Menu, MoreHorizontal, Package, Plus, Search, Settings2, ShoppingBag, ShoppingCart, Sparkles, X, Wifi, WifiOff } from 'lucide-react';
import './style.css';

const firebaseConfigured = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'].every(key => Boolean(import.meta.env[key]));

const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value || 0);
const initialForm = { name: '', sku: '', category: 'Для дома', cost: '', price: '', stock: '', productId: '' };
const categoriesList = ['Для дома', 'Ароматы', 'Аксессуары', 'Канцелярия', 'Другое'];
const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const localLoad = key => { try { const value = localStorage.getItem(key); const rows = value ? JSON.parse(value) : []; if (!Array.isArray(rows)) return []; const demoIds = key === 'tovarika-products' ? new Set([1, 2, 3, 4, 5]) : new Set([1, 2, 3, 4]); const clean = rows.filter(row => !demoIds.has(row.id)); if (clean.length !== rows.length) localStorage.setItem(key, JSON.stringify(clean)); return clean; } catch { return []; } };

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState(() => firebaseConfigured ? [] : localLoad('tovarika-products'));
  const [transactions, setTransactions] = useState(() => firebaseConfigured ? [] : localLoad('tovarika-transactions'));
  const [connected, setConnected] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [period, setPeriod] = useState('За год');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все товары');
  const [modal, setModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    if (!firebaseConfigured) { setAuthReady(true); return undefined; }
    import('./firebase').then(({ observeUser }) => observeUser(value => { if (active) { setUser(value); setAuthReady(true); } })).catch(error => { if (active) { setSyncError(error.message); setAuthReady(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    if (!user) { setProducts([]); setTransactions([]); setConnected(false); return undefined; }
    let stop = () => {};
    let active = true;
    setConnected(false); setSyncError('');
    import('./firebase').then(({ subscribeToStore }) => {
      if (active) stop = subscribeToStore(user.uid, data => { setProducts(data.products); setTransactions(data.transactions); setConnected(true); }, error => { setSyncError(error.message); setConnected(false); });
    }).catch(error => { setSyncError(error.message); setConnected(false); });
    return () => { active = false; stop(); };
  }, [user]);
  const persistLocal = (nextProducts, nextTransactions) => {
    setProducts(nextProducts); setTransactions(nextTransactions);
    localStorage.setItem('tovarika-products', JSON.stringify(nextProducts));
    localStorage.setItem('tovarika-transactions', JSON.stringify(nextTransactions));
  };
  const run = async action => { setBusy(true); setSyncError(''); try { await action(); return true; } catch (error) { setSyncError(error.message || 'Не удалось сохранить данные.'); return false; } finally { setBusy(false); } };
  const filtered = useMemo(() => products.filter(p => (category === 'Все товары' || p.category === category) && `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, category, search]);
  const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  const stockValue = products.reduce((sum, p) => sum + Number(p.cost || 0) * Number(p.stock || 0), 0);
  const lowStock = products.filter(p => p.stock < 6).length;
  const selectedYear = Number(year);
  const yearTransactions = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
  const currentMonthSales = transactions.filter(t => t.type === 'sale' && new Date(t.date).getFullYear() === new Date(now).getFullYear() && new Date(t.date).getMonth() === new Date(now).getMonth()).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const salesYear = yearTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const categories = ['Все товары', ...new Set(products.map(p => p.category).filter(Boolean))];
  const chartData = useMemo(() => {
    const monthly = monthNames.map(month => ({ month, sales: 0, income: 0, stock: 0 }));
    yearTransactions.forEach(t => { const i = new Date(t.date).getMonth(); if (t.type === 'sale') monthly[i].sales += Number(t.amount || 0); else monthly[i].income += Number(t.amount || 0); });
    let runningStock = products.reduce((sum, p) => sum + Number(p.cost || 0) * Number(p.stock || 0), 0);
    const current = new Date(now);
    const lastMonth = selectedYear === current.getFullYear() ? current.getMonth() : 11;
    for (let i = lastMonth; i >= 0; i--) {
      monthly[i].stock = runningStock;
      const movementValue = yearTransactions.filter(t => new Date(t.date).getMonth() === i).reduce((sum, t) => sum + (t.type === 'sale' ? -1 : 1) * Number(t.unitCost || 0) * Number(t.qty || 0), 0);
      runningStock -= movementValue;
    }
    return period === 'За месяц' ? monthly.map((item, i) => i === current.getMonth() && selectedYear === current.getFullYear() ? item : { ...item, sales: 0, income: 0 }) : monthly;
  }, [yearTransactions, period, products, now, selectedYear]);

  const addProduct = async e => {
    e.preventDefault();
    const product = { name: form.name.trim(), sku: form.sku.trim(), category: form.category, cost: Number(form.cost), price: Number(form.price), stock: Number(form.stock), sold: 0, color: ['lilac', 'peach', 'blue', 'mint', 'yellow'][products.length % 5] };
    const ok = await run(async () => {
      if (firebaseConfigured) { if (!user) throw new Error('Войдите в Google, чтобы сохранить товар.'); const { createProduct } = await import('./firebase'); await createProduct(user.uid, product); }
      else { const id = Date.now(); const withProduct = [{ ...product, id }, ...products]; const withInitialStock = product.stock > 0 ? [{ id: id + 1, type: 'purchase', title: `Начальный остаток · ${product.name}`, productId: String(id), productName: product.name, date: new Date().toISOString(), qty: product.stock, amount: product.cost * product.stock, unitCost: product.cost, unitPrice: product.price }, ...transactions] : transactions; persistLocal(withProduct, withInitialStock); }
    });
    if (ok) { setForm(initialForm); setModal(null); }
  };
  const recordMovement = async e => {
    e.preventDefault(); const qty = Number(form.stock); const product = products.find(p => String(p.id) === String(form.productId)); if (!product || qty < 1) return;
    const isSale = modal === 'sale'; if (isSale && qty > product.stock) { setSyncError('На складе недостаточно товара для этой продажи.'); return; }
    const type = isSale ? 'sale' : 'purchase'; const date = new Date().toISOString();
    const operation = { type, title: `${isSale ? 'Продажа' : 'Поступление'} · ${product.name}`, productId: String(product.id), productName: product.name, date, qty, amount: (isSale ? product.price : product.cost) * qty, unitCost: Number(product.cost), unitPrice: Number(product.price) };
    const ok = await run(async () => {
      if (firebaseConfigured) { if (!user) throw new Error('Войдите в Google, чтобы сохранить операцию.'); const { createMovement } = await import('./firebase'); await createMovement(user.uid, String(product.id), type, qty); }
      else { const nextProducts = products.map(p => String(p.id) === String(product.id) ? { ...p, stock: p.stock + (isSale ? -qty : qty), sold: (p.sold || 0) + (isSale ? qty : 0) } : p); persistLocal(nextProducts, [{ ...operation, id: Date.now() }, ...transactions]); }
    });
    if (ok) { setForm(initialForm); setModal(null); }
  };
  const handleLogin = () => run(async () => { const { loginWithGoogle } = await import('./firebase'); await loginWithGoogle(); });
  const handleLogout = () => import('./firebase').then(({ logout }) => logout()).catch(error => setSyncError(error.message));
  const exportCsv = () => { const csv = ['Название,Артикул,Категория,Закупка,Продажа,Остаток,Продано', ...products.map(p => [p.name, p.sku, p.category, p.cost, p.price, p.stock, p.sold || 0].map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'tovarika-inventory.csv'; a.click(); URL.revokeObjectURL(a.href); };
  const modalTitle = modal === 'sale' ? 'Записать продажу' : 'Добавить поступление';

  if (!authReady) return <div className="gate-screen"><div className="gate-card"><span className="brand-icon"><ShoppingBag size={19}/></span><p>Подключаем ваш магазин…</p></div></div>;
  if (firebaseConfigured && !user) return <div className="gate-screen"><div className="gate-card"><a className="brand gate-brand" href="#"><span className="brand-icon"><ShoppingBag size={19}/></span><span>товарика<span className="brand-dot">.</span></span></a><div className="gate-art"><Boxes size={44}/><span><i/><i/><i/></span></div><div className="eyebrow"><span className="eyebrow-dot"/> ЛИЧНЫЙ УЧЕТ ТОВАРОВ</div><h1>Ваш магазин.<br/>Всё под контролем.</h1><p>Войдите в Google, чтобы видеть свои товары, остатки и продажи на всех устройствах в реальном времени.</p>{syncError && <div className="error-banner">{syncError}</div>}<button className="google-btn" onClick={handleLogin} disabled={busy}><GoogleMark/>{busy ? 'Подключаем…' : 'Продолжить с Google'}</button><small>Ваши данные доступны только вашему Google-аккаунту.</small></div></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><a className="brand" href="#"><span className="brand-icon"><ShoppingBag size={19}/></span><span>товарика<span className="brand-dot">.</span></span></a>
      <button className="store-switch"><span className="store-avatar">А</span><span className="store-name"><b>Мой магазин</b><small>Основной склад</small></span><ChevronDown size={15}/></button>
      <div className="side-label">РАБОЧИЙ СТОЛ</div><nav className="nav-list"><button className="nav-item active"><LayoutDashboard size={17}/><span>Обзор</span></button><button className="nav-item" onClick={() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' })}><Package size={17}/><span>Мои товары</span><span className="nav-count">{products.length}</span></button><button className="nav-item" onClick={() => { setForm(initialForm); setModal('purchase'); }}><ArrowDownLeft size={17}/><span>Поступления</span></button><button className="nav-item" onClick={() => { setForm(initialForm); setModal('sale'); }}><ShoppingCart size={17}/><span>Продажи</span></button><button className="nav-item" onClick={() => document.getElementById('analytics')?.scrollIntoView({ behavior: 'smooth' })}><ChartNoAxesCombined size={17}/><span>Аналитика</span></button></nav>
      <div className="side-label side-label-lower">НАСТРОЙКИ</div><nav className="nav-list"><button className="nav-item" onClick={firebaseConfigured ? handleLogout : undefined}><Settings2 size={17}/><span>Настройки</span></button>{firebaseConfigured && <button className="nav-item" onClick={handleLogout}><LogOut size={17}/><span>Выйти из аккаунта</span></button>}<button className="nav-item"><CircleHelp size={17}/><span>Помощь</span></button></nav>
      <div className="sidebar-bottom"><div className="tip-card"><div className="tip-title"><Sparkles size={15}/> Маленький совет</div><p>Отмечайте поступления вовремя — так остатки всегда будут точными.</p></div><div className="profile"><div className="profile-avatar">А</div><div><b>{firebaseConfigured ? user?.displayName || 'Андрей' : 'Андрей'}</b><span>Владелец магазина</span></div><MoreHorizontal size={17}/></div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" aria-label="Закрыть меню" onClick={() => setMobileNav(false)}/>}
    <main className="main"><header className="topbar"><button className="mobile-menu" aria-label="Открыть меню" onClick={() => setMobileNav(!mobileNav)}><Menu size={21}/></button><div className="breadcrumbs">Мой магазин <span>/</span> <b>Обзор</b></div><div className="top-actions"><span className={`sync-state ${connected || !firebaseConfigured ? 'online' : 'offline'}`}>{connected || !firebaseConfigured ? <Wifi size={13}/> : <WifiOff size={13}/>}<span>{firebaseConfigured ? connected ? 'Синхронизировано' : 'Подключение…' : 'Локальный режим'}</span></span><span className="today"><CalendarDays size={15}/> {new Date(now).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}</span><div className="top-avatar">А</div></div></header>
      <section className="content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot"/> ВАШ МАГАЗИН СЕГОДНЯ</div><h1>Добрый день, Андрей <span className="wave">✳</span></h1><p className="subtitle">Реальная картина продаж и остатков вашего магазина.</p></div><button className="primary-btn" onClick={() => { setForm(initialForm); setModal('product'); }}><Plus size={18}/>Добавить товар</button></div>
        {syncError && <div className="error-banner"><WifiOff size={15}/>{syncError}<button onClick={() => setSyncError('')} aria-label="Закрыть"><X size={15}/></button></div>}
        <div className="stats-grid"><div className="stat-card stat-sales"><div className="stat-top"><span>Продажи за месяц</span><span className="stat-icon"><BadgeRussianRuble size={18}/></span></div><div className="stat-value">{money(currentMonthSales)}</div><div className="stat-foot">По записанным операциям · {new Date(now).toLocaleDateString('ru-RU', { month: 'long' })}</div></div>
          <div className="stat-card"><div className="stat-top"><span>Товаров на складе</span><span className="stat-icon green"><Boxes size={18}/></span></div><div className="stat-value">{totalStock}<small> шт.</small></div><div className="stat-foot">В {products.length} товарных позициях</div><div className="mini-progress"><i style={{ width: `${Math.min(100, totalStock * 1.3)}%` }}/></div></div>
          <div className="stat-card"><div className="stat-top"><span>Закупочная стоимость</span><span className="stat-icon lilac"><Archive size={18}/></span></div><div className="stat-value">{money(stockValue)}</div><div className="stat-foot">Текущего остатка по цене закупки</div><div className="stat-foot-icon"><ChartNoAxesCombined size={15}/></div></div>
          <div className="stat-card"><div className="stat-top"><span>Заканчиваются</span><span className="stat-icon amber"><Package size={18}/></span></div><div className="stat-value">{lowStock}<small> товаров</small></div><div className="stat-foot">Остаток меньше 6 штук</div><button className="low-link" onClick={() => { setCategory('Все товары'); document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' }); }}>Проверить остатки <ArrowUpRight size={14}/></button></div></div>
        <section className="panel chart-panel" id="analytics"><div className="panel-heading"><div><div className="heading-title"><h2>Динамика магазина</h2><span className={`live-badge ${firebaseConfigured && connected ? '' : 'local-badge'}`}><i/>{firebaseConfigured && connected ? 'синхронизация live' : 'по операциям'}</span></div><p>Поступления, продажи и стоимость остатка · {year}</p></div><div className="chart-controls"><select value={year} onChange={e => setYear(e.target.value)} aria-label="Год">{[...new Set([String(new Date(now).getFullYear()), ...transactions.map(t => String(new Date(t.date).getFullYear()))])].sort((a,b) => b-a).map(y => <option key={y}>{y}</option>)}</select><div className="period-tabs">{['За год', 'За месяц'].map(p => <button className={period === p ? 'selected' : ''} key={p} onClick={() => setPeriod(p)}>{p}</button>)}</div></div></div>
          <div className="chart-legend"><span><i className="legend-sales"/> Продажи <b>{money(salesYear)}</b></span><span><i className="legend-income"/> Поступления <b>{money(yearTransactions.filter(t => t.type !== 'sale').reduce((s,t) => s + Number(t.amount || 0), 0))}</b></span><span><i className="legend-stock"/> Остаток по закупке</span></div>{yearTransactions.length === 0 && <div className="chart-empty">График появится после первых операций с товаром.</div>}<div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70937f" stopOpacity={0.24}/><stop offset="100%" stopColor="#70937f" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e1e6e1" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#b6beb6', fontSize: 11 }} dy={11}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#b6beb6', fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}к`}/><Tooltip formatter={v => money(v)} contentStyle={{ border: '1px solid #343d38', background: '#202622', color: '#eff3ed', borderRadius: 10, fontSize: 12 }}/><Area type="monotone" dataKey="stock" name="Остаток по закупке" stroke="#c19b6d" strokeDasharray="5 5" strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="income" name="Поступления" stroke="#a99bc5" strokeWidth={2} fill="transparent"/><Area type="monotone" dataKey="sales" name="Продажи" stroke="#80ac91" strokeWidth={2.5} fill="url(#salesFill)"/></AreaChart></ResponsiveContainer></div><div className="chart-note"><span>₽</span> Статистика строится только по товарам и операциям, внесённым в приложение. Исторических данных до начала учета нет.</div>
        </section>
        <div className="lower-grid"><section className="panel inventory-panel" id="inventory"><div className="panel-heading inventory-heading"><div><h2>Товары на складе <span className="heading-count">{filtered.length}</span></h2><p>Управляйте ассортиментом и остатками</p></div><button className="icon-action" aria-label="Экспорт CSV" onClick={exportCsv}><Download size={17}/></button></div><div className="inventory-tools"><label className="search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти товар..."/></label><label className="category-select"><span>Категория</span><select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={13}/></label><button className="filter-btn" aria-label="Экспорт CSV" onClick={exportCsv}><Download size={15}/></button></div>
          <div className="table-wrap"><table><thead><tr><th>ТОВАР</th><th>ЗАКУПКА</th><th>ПРОДАЖА</th><th>ОСТАТОК</th><th>СТАТУС</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="product-cell"><div className={`product-thumb ${p.color || 'mint'}`}><Package size={18}/></div><div><b>{p.name}</b><span>{p.sku} · {p.category}</span></div></div></td><td>{money(p.cost)}</td><td><b className="price-value">{money(p.price)}</b></td><td><b className={p.stock < 6 ? 'stock-low' : ''}>{p.stock} шт.</b></td><td><span className={`stock-badge ${p.stock < 6 ? 'badge-low' : p.stock < 12 ? 'badge-medium' : 'badge-ok'}`}><i/>{p.stock < 6 ? 'Мало' : p.stock < 12 ? 'Заканчивается' : 'В наличии'}</span></td></tr>)}{filtered.length === 0 && <tr><td colSpan="5"><div className="empty-state">{products.length ? 'Товаров не найдено' : 'Здесь появятся ваши товары. Добавьте первую позицию.'}</div></td></tr>}</tbody></table></div><div className="panel-footer"><span>Показано <b>{filtered.length}</b> из <b>{products.length}</b> товаров</span><button onClick={() => { setForm(initialForm); setModal('product'); }}>Добавить товар <Plus size={14}/></button></div>
        </section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Последние операции</h2><p>Движение товара за последнее время</p></div><button className="icon-action" aria-label="Экспорт CSV" onClick={exportCsv}><MoreHorizontal size={18}/></button></div><div className="activity-list">{transactions.slice(0, 5).map(t => <div className="activity-row" key={t.id}><div className={`activity-icon ${t.type === 'sale' ? 'sale' : 'purchase'}`}>{t.type === 'sale' ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}</div><div className="activity-info"><b>{t.title || `${t.type === 'sale' ? 'Продажа' : 'Поступление'} · ${t.productName}`}</b><span>{new Date(t.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {t.qty} шт.</span></div><strong className={t.type === 'sale' ? 'amount-sale' : 'amount-buy'}>{t.type === 'sale' ? '+' : '−'}{money(t.amount)}</strong></div>)}{transactions.length === 0 && <div className="empty-state">История операций появится после первой продажи или поступления.</div>}</div><button className="activity-link" onClick={() => { setForm(initialForm); setModal('purchase'); }}>Записать поступление <Plus size={15}/></button></section></div>
        <footer className="page-footer"><span>© {new Date(now).getFullYear()} Товарика · Андрей</span><span><span className="saved-dot"/>{firebaseConfigured ? connected ? ' Синхронизация с Firebase активна' : ' Подключение к Firebase' : ' Локальный режим · облако не подключено'}</span></footer>
      </section></main>
    {modal && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="dialog"><div className="dialog-head"><div><div className="dialog-icon"><Plus size={19}/></div><h2>{modal === 'product' ? 'Новый товар' : modalTitle}</h2><p>{modal === 'product' ? 'Добавьте товар в каталог магазина.' : 'Выберите товар и укажите количество.'}</p></div><button className="close-btn" onClick={() => setModal(null)} aria-label="Закрыть"><X size={19}/></button></div>{modal === 'product' ? <form onSubmit={addProduct}><label>Название товара<input autoFocus placeholder="Например, Кружка ручной работы" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required/></label><div className="form-row"><label>Артикул<input placeholder="HOM-024" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required/></label><label>Категория<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categoriesList.map(c => <option key={c}>{c}</option>)}</select></label></div><div className="form-row"><label>Цена закупки, ₽<input type="number" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} required/></label><label>Цена продажи, ₽<input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required/></label></div><label>Количество на складе<input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required/></label><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Отмена</button><button type="submit" className="primary-btn" disabled={busy}><Plus size={17}/>{busy ? 'Сохраняем…' : 'Добавить товар'}</button></div></form> : <form onSubmit={recordMovement}><label>Товар<select required value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })}><option value="" disabled>Выберите товар</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · остаток {p.stock}</option>)}</select></label><label>Количество<input autoFocus type="number" min="1" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required/></label>{modal === 'sale' && <p className="form-hint">Количество не может превышать остаток товара на складе.</p>}{syncError && <div className="error-banner">{syncError}</div>}<div className="dialog-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Отмена</button><button type="submit" className="primary-btn" disabled={busy}><Plus size={17}/>{busy ? 'Сохраняем…' : modal === 'sale' ? 'Записать продажу' : 'Добавить поступление'}</button></div></form>}</div></div>}
  </div>;
}

function GoogleMark() { return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.7-3.5-11.3-8.2H5.8v5.1A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.7 27.9a12 12 0 0 1 0-7.8V15H5.8a20 20 0 0 0 0 18l6.9-5.1Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15l6.9 5.1c1.6-4.7 6-8.2 11.3-8.2Z"/></svg>; }
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
