import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
    try {
        return (window as any).process?.env?.API_KEY || (process as any)?.env?.API_KEY || "";
    } catch (e) { return ""; }
};

const API_URL = 'https://script.google.com/macros/s/AKfycby9pjKHhH1ZmbDgNV8mHCrcgFK27aShBU2ujepBFvSbw6O4ZvClykOmVTAXmhOCyNri/exec';
const DASHBOARD_URL = 'https://vinylpressusa.com/grenada-dashboard-mobile/';
const HUB_LOGO = 'https://vinylpressusa.com/wp-content/uploads/2025/12/38D06428-7D3B-44EF-B4A9-472C4EDDEB9F.png';

const CONTACTS = [
    { name: "Quencie", phone: "(484) 513-5528", tel: "tel:+14845135528" },
    { name: "Michael", phone: "(610) 703-5185", tel: "tel:+16107035185" }
];

const GENDERS = ["Men's", "Women's", "Children's", "Unisex"];
const PRODUCT_TYPES = ["Apparel", "Footwear", "Food", "Cleaning products", "Used items", "Electronics", "Luxury", "Misc"];

const APPAREL_SIZES = [
    "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", 
    "Kids 2T", "Kids 3T", "Kids 4T", "Kids 5", "Kids 6", "Kids 7", "Kids 8", "Kids 10", "Kids 12", "Kids 14", "Kids 16",
    "One Size"
];

const SHOE_SIZES = [
    "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "13.5", "14", "14.5"
];

const DEFAULT_DELIVERY_TABS = ["May Shipment", "April Shipment", "Watchlist", "Amazon Order"];
const EC_RATE = 2.7169;
const IMG_SEP = '|||';

const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
};

const Form = ({ item, tabs, onClose, onSave, onDelete }: any) => {
    const [f, setF] = useState({
        ...item,
        gender: item.gender || "Men's",
        size: item.size || '',
        shoeSize: item.shoeSize || '',
        link: item.link || '',
        note: item.note || ''
    });
    const [scanning, setScanning] = useState(false);
    const [curMode, setCurMode] = useState("XCD");

    const snap = (e: React.ChangeEvent<HTMLInputElement>) => {
        const apiKey = getApiKey();
        if (!e.target.files?.[0] || !apiKey) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const raw = reader.result as string;
            const comp = await compressImage(raw);
            setScanning(true);
            try {
                const ai = new GoogleGenAI({ apiKey });
                const res = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { 
                        parts: [
                            { text: "Identify product details. Name, Category, and Size if visible. JSON: {name, costUSD, categorySuggestion, sizeSuggestion}" }, 
                            { inlineData: { data: comp.split(',')[1], mimeType: 'image/jpeg' } }
                        ] 
                    },
                    config: { responseMimeType: "application/json" }
                });
                const d = JSON.parse(res.text || '{}');
                setF((p: any) => ({ 
                    ...p, 
                    img: [...p.img, comp], 
                    name: d.name || p.name, 
                    cost: d.costUSD || p.cost,
                    type: d.categorySuggestion || p.type,
                    size: d.sizeSuggestion || p.size,
                    sell: d.costUSD ? (d.costUSD * EC_RATE * 1.5).toFixed(2) : p.sell
                }));
            } catch (e) { setF((p: any) => ({ ...p, img: [...p.img, comp] })); }
            setScanning(false);
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div style={styles.photoGallery}>
                    {f.img.map((u: string, i: number) => (
                        <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={u} style={styles.photoThumb} />
                            <button onClick={() => setF({ ...f, img: f.img.filter((_, idx) => idx !== i) })} style={styles.photoDeleteBtn}>&times;</button>
                        </div>
                    ))}
                    {f.img.length < 6 && (
                        <label style={styles.photoAddBtn}>
                            {scanning ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-camera"></i>}
                            <input type="file" hidden accept="image/*" onChange={snap} />
                        </label>
                    )}
                </div>

                <div style={styles.formRow}>
                    <div style={{ flex: 1 }}><label style={styles.hubLabel}>CATEGORY</label>
                        <select style={styles.hubInput} value={f.tab} onChange={e => setF({ ...f, tab: e.target.value })}>
                            {tabs.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}><label style={styles.hubLabel}>TYPE</label>
                        <select style={styles.hubInput} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
                            {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                    <label style={styles.hubLabel}>PRODUCT NAME</label>
                    <input style={styles.hubInput} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
                </div>

                <div style={styles.formRow}>
                    <div style={{ flex: 1 }}><label style={styles.hubLabel}>GENDER</label>
                        <select style={styles.hubInput} value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })}>
                            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    {f.type === "Apparel" && (
                        <div style={{ flex: 1 }}>
                            <label style={styles.hubLabel}>APPAREL SIZE</label>
                            <select style={styles.hubInput} value={f.size} onChange={e => setF({ ...f, size: e.target.value })}>
                                <option value="">Select...</option>
                                {APPAREL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    {f.type === "Footwear" && (
                        <div style={{ flex: 1 }}>
                            <label style={styles.hubLabel}>SHOE SIZE (US)</label>
                            <select style={styles.hubInput} value={f.shoeSize} onChange={e => setF({ ...f, shoeSize: e.target.value })}>
                                <option value="">Select...</option>
                                {SHOE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div style={styles.formRow}>
                    <div style={{ flex: 1 }}><label style={styles.hubLabel}>COST (USD)</label>
                        <input type="number" style={styles.hubInput} value={f.cost} onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setF({ ...f, cost: val, sell: (val * EC_RATE * 1.5).toFixed(2) });
                        }} />
                    </div>
                    <div style={{ flex: 1 }}><label style={styles.hubLabel}>QTY</label>
                        <input type="number" style={styles.hubInput} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} />
                    </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                    <label style={styles.hubLabel}>ONLINE LINK</label>
                    <input style={styles.hubInput} value={f.link} placeholder="Paste link here..." onChange={e => setF({ ...f, link: e.target.value })} />
                </div>

                <div style={{ marginBottom: 18 }}>
                    <label style={styles.hubLabel}>NOTES / SPECS</label>
                    <textarea style={{...styles.hubInput, minHeight: 80, resize: 'none'}} value={f.note} placeholder="Add color, specific sizes, or notes..." onChange={e => setF({ ...f, note: e.target.value })} />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <label style={styles.hubLabel}>RETAIL HUB ({curMode})</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <span onClick={() => setCurMode("USD")} style={{ fontSize: 9, fontWeight: 700, color: curMode === "USD" ? "#00f2ff" : "#555", cursor: 'pointer', fontFamily: 'Orbitron' }}>USD</span>
                            <span onClick={() => setCurMode("XCD")} style={{ fontSize: 9, fontWeight: 700, color: curMode === "XCD" ? "#00f2ff" : "#555", cursor: 'pointer', fontFamily: 'Orbitron' }}>XCD</span>
                        </div>
                    </div>
                    <input type="number" style={{...styles.retailHero, borderColor: (f.sell || 0) == 0 ? '#ffaa00' : '#00f2ff'}} 
                        value={curMode === "USD" ? (f.sell / EC_RATE).toFixed(2) : f.sell} 
                        onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setF({ ...f, sell: curMode === "USD" ? (val * EC_RATE).toFixed(2) : val });
                        }} />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={onClose} style={styles.backBtn}>DISCARD</button>
                    {item.name && <button onClick={() => onDelete(item)} style={styles.deleteBtn}><i className="fas fa-trash-alt"></i></button>}
                    <button onClick={() => { onSave(f); onClose(); }} style={styles.syncBtn}>SYNC HUB</button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [items, setItems] = useState([]);
    const [tabs, setTabs] = useState(DEFAULT_DELIVERY_TABS);
    const [active, setActive] = useState("ALL");
    const [cur, setCur] = useState("USD");
    const [modal, setModal] = useState(null);
    const [callModal, setCallModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState(CONTACTS[0]);
    const [confirmingCall, setConfirmingCall] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [error, setError] = useState(null);

    const clearBoot = () => {
        const boot = document.getElementById('boot-screen');
        if (boot) {
            boot.style.opacity = '0';
            setTimeout(() => { boot.style.display = 'none'; }, 400);
        }
    };

    const loadData = async () => {
        setSyncing(true);
        setError(null);
        try {
            const r = await fetch(`${API_URL}?cache=${Date.now()}`);
            const d = await r.json();
            if (Array.isArray(d)) {
                const raw = d.map(x => ({
                    id: `${x['Product Name']}-${x['Category/Tab']}-${Math.random()}`,
                    name: (x['Product Name'] || '').trim(),
                    img: (x['Image URL'] || '').split(IMG_SEP).filter(Boolean),
                    cost: parseFloat(x['Cost Price USD'] || 0),
                    sell: parseFloat(x['Selling Price XCD'] || 0),
                    qty: parseInt(x['Quantity'] || 1),
                    link: x['Online Link'] || '',
                    note: x['Note'] || '',
                    type: x['Product Type'] || "Misc",
                    gender: x['Gender'] || "Unisex",
                    tab: (x['Category/Tab'] || "Watchlist").trim(),
                    status: x['Status'] || 'Assigned',
                    size: x['Size'] || '',
                    shoeSize: x['Shoe Size'] || ''
                }));
                setItems(raw);
                const sheetTabs = [...new Set(raw.map(i => i.tab))].filter(Boolean);
                if (sheetTabs.length) setTabs(prev => [...new Set([...DEFAULT_DELIVERY_TABS, ...sheetTabs])]);
                setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
        } catch (e) { 
            console.error('Fetch error:', e);
            setError("HUB LINK ERROR"); 
        } finally { 
            setSyncing(false); 
            clearBoot(); 
        }
    };

    useEffect(() => { loadData(); }, []);

    const performSync = async (payload) => {
        setSyncing(true);
        try {
            const query = new URLSearchParams({
                '_action': payload._action,
                'Product Name': payload['Product Name'] || '',
                'Category/Tab': payload['Category/Tab'] || '',
                'Cost Price USD': (payload['Cost Price USD'] || 0).toString(),
                'Selling Price XCD': (payload['Selling Price XCD'] || 0).toString(),
                'Quantity': (payload['Quantity'] || 1).toString(),
                'Status': payload['Status'] || 'Assigned',
                'Online Link': payload['Online Link'] || '',
                'Note': payload['Note'] || '',
                'Product Type': payload['Product Type'] || 'Misc',
                'Gender': payload['Gender'] || 'Unisex',
                'Size': payload['Size'] || '',
                'Shoe Size': payload['Shoe Size'] || '',
                'timestamp': Date.now().toString()
            }).toString();

            await fetch(`${API_URL}?${query}`, { method: 'POST', mode: 'no-cors' });
            setTimeout(loadData, 3000);
        } catch (err) { setSyncing(false); }
    };

    const handleSave = async (f) => {
        const action = items.some(i => i.name === f.name && i.tab === f.tab) ? 'update' : 'create';
        await performSync({
            ...f,
            'Product Name': f.name,
            'Category/Tab': f.tab,
            'Cost Price USD': f.cost,
            'Selling Price XCD': f.sell,
            'Quantity': f.qty,
            'Product Type': f.type,
            'Gender': f.gender,
            'Online Link': f.link,
            'Note': f.note,
            'Size': f.size,
            'Shoe Size': f.shoeSize,
            'Image URL': f.img.join(IMG_SEP),
            '_action': action
        });
    };

    const handleDelete = async (item) => {
        if (!confirm(`Remove ${item.name} from hub?`)) return;
        await performSync({ 'Product Name': item.name, 'Category/Tab': item.tab, '_action': 'delete' });
    };

    const filteredItems = useMemo(() => active === "ALL" ? items : items.filter(i => i.tab === active), [items, active]);
    const totalSpentUSD = useMemo(() => items.filter(i => ['Purchased', 'Shipped', 'Received'].includes(i.status)).reduce((a, b) => a + (b.cost * b.qty), 0), [items]);

    const fmt = (v, isX = false) => {
        let val = v;
        let s = cur === 'USD' ? '$' : 'EC$';
        if (cur === 'XCD' && !isX) val = v * EC_RATE;
        if (cur === 'USD' && isX) val = v / EC_RATE;
        return `${s}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    };

    return (
        <div style={styles.appShell}>
            {syncing && <div style={styles.syncOverlay}><i className="fas fa-spinner fa-spin"></i> UPLINKING...</div>}
            {error && <div style={styles.errorBar}>{error}</div>}

            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => setCallModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <img src={HUB_LOGO} style={styles.logo} alt="LOGO" />
                        </button>
                        <div>
                            <h1 style={styles.title}>GRANADA HUB</h1>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <a href={DASHBOARD_URL} target="_blank" style={styles.navBtn}>DASHBOARD</a>
                                {lastSync && <span style={styles.lastSync}>SYNC: {lastSync}</span>}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={styles.spentLabel}>CUMULATIVE SPENT</span>
                        <strong style={styles.spentValue}>{fmt(totalSpentUSD)}</strong>
                    </div>
                </div>
                <div style={styles.headerActions}>
                    <button onClick={() => setModal({ name: '', cost: 0, sell: 0, qty: 1, type: 'Misc', gender: "Unisex", tab: active === "ALL" ? 'Watchlist' : active, status: 'Assigned', img: [], link: '', note: '', size: '', shoeSize: '' })} style={styles.addBtn}>+ ADD PRODUCT</button>
                    <button onClick={() => setCur(cur === 'USD' ? 'XCD' : 'USD')} style={styles.curBtn}>{cur}</button>
                    <button onClick={loadData} style={styles.refreshBtn}><i className="fas fa-sync-alt"></i></button>
                </div>
            </header>

            <div style={styles.tabsRow}>
                <button onClick={() => setActive("ALL")} style={{...styles.tabBtn, borderColor: active === "ALL" ? '#00ff88' : '#1a1a1c', color: active === "ALL" ? '#00ff88' : '#555'}}>ALL</button>
                {tabs.map(t => <button key={t} onClick={() => setActive(t)} style={{...styles.tabBtn, borderColor: active === t ? '#00f2ff' : '#1a1a1c', color: active === t ? '#00f2ff' : '#555'}}>{t.toUpperCase()}</button>)}
            </div>

            <main style={{ padding: '0 16px', paddingBottom: 100 }}>
                {filteredItems.map(i => (
                    <div key={i.id} onClick={() => setModal(i)} style={styles.productCard}>
                        <div style={styles.imgContainer}>
                            <img src={i.img[0] || 'https://via.placeholder.com/100?text=NONE'} style={styles.productImg} />
                            <div style={styles.qtyBadge}>{i.qty}</div>
                        </div>
                        <div style={{ flex: 1, paddingLeft: 12 }}>
                            <span style={styles.typeLabel}>{i.type.toUpperCase()} | {i.gender.toUpperCase()}</span>
                            <h3 style={styles.productName}>{i.name}</h3>
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                {i.size && <span style={styles.metaBadge}>S: {i.size}</span>}
                                {i.shoeSize && <span style={styles.metaBadge}>US: {i.shoeSize}</span>}
                            </div>
                            <div style={{ color: '#00f2ff', fontSize: 20, fontWeight: 700, fontFamily: 'Orbitron', marginTop: 6 }}>{fmt(i.sell, true)}</div>
                        </div>
                        <div className={`status-badge status-${i.status.toLowerCase()}`} style={styles.statusBadge}>{i.status.toUpperCase()}</div>
                    </div>
                ))}
            </main>

            {callModal && (
                <div style={styles.modalOverlay} onClick={() => setCallModal(false)}>
                    <div style={styles.terminalContainer} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setCallModal(false)} style={styles.closeIconBtn}>&times;</button>
                        <h2 style={styles.terminalTitle}>UPLINK TERMINAL</h2>
                        <div style={styles.terminalTabs}>
                            {CONTACTS.map(c => (
                                <button key={c.name} onClick={() => { setSelectedContact(c); setConfirmingCall(false); }} 
                                    style={{...styles.terminalTabBtn, background: selectedContact.name === c.name ? '#00f2ff' : '#111', color: selectedContact.name === c.name ? '#000' : '#444'}}>
                                    {c.name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <div style={styles.terminalDisplay}>
                            <div style={{ fontSize: 9, color: '#00f2ff', marginBottom: 10, letterSpacing: 1 }}>STATUS: READY</div>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Orbitron' }}>{selectedContact.name}</div>
                            <div style={{ fontSize: 13, color: '#00ff88', marginTop: 8 }}>{selectedContact.phone}</div>
                        </div>
                        {!confirmingCall ? <button onClick={() => setConfirmingCall(true)} style={styles.initiateBtn}>INITIATE ENCRYPTED CALL</button> : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
                                <button onClick={() => setConfirmingCall(false)} style={styles.abortBtn}>CANCEL</button>
                                <a href={selectedContact.tel} style={styles.dialBtn} onClick={() => setCallModal(false)}>DIAL HUB</a>
                            </div>
                        )}
                        <button onClick={() => setCallModal(false)} style={styles.bottomDiscardBtn}>CLOSE TERMINAL</button>
                    </div>
                </div>
            )}
            {modal && <Form item={modal} tabs={tabs} onClose={() => setModal(null)} onSave={handleSave} onDelete={handleDelete} />}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    appShell: { width: '100%', maxWidth: '500px', margin: '0 auto', minHeight: '100vh', background: '#0a0a0c', borderLeft: '1px solid #1a1a1c', borderRight: '1px solid #1a1a1c' },
    syncOverlay: { position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#00f2ff', color: '#000', padding: '10px 20px', borderRadius: 40, fontWeight: 800, fontSize: 10, zIndex: 9999, fontFamily: 'Orbitron' },
    errorBar: { background: '#ff4d4d', color: '#fff', textAlign: 'center', fontSize: 9, padding: 4, fontWeight: 700, fontFamily: 'Orbitron' },
    header: { padding: '20px 16px', borderBottom: '1px solid #1a1a1c', position: 'sticky', top: 0, background: '#0a0a0c', zIndex: 100 },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    logo: { width: 42, height: 42, borderRadius: '50%', border: '1px solid #00f2ff', background: '#111' },
    title: { fontFamily: 'Orbitron', fontSize: 16, color: '#ffffff', letterSpacing: 2, margin: 0 },
    navBtn: { background: '#111', border: '1px solid #222', color: '#666', padding: '5px 10px', borderRadius: 4, fontSize: 8, textDecoration: 'none', fontFamily: 'Orbitron', fontWeight: 700 },
    lastSync: { fontSize: 8, color: '#333', alignSelf: 'center', fontFamily: 'monospace' },
    spentLabel: { fontSize: 8, color: '#00ff88', fontWeight: 700, display: 'block', fontFamily: 'Orbitron' },
    spentValue: { fontSize: 20, fontWeight: 700, fontFamily: 'Orbitron' },
    headerActions: { display: 'grid', gridTemplateColumns: '1fr 65px 48px', gap: 10 },
    addBtn: { height: 44, background: 'transparent', border: '1px solid #00f2ff', color: '#00f2ff', borderRadius: 6, fontWeight: 700, fontSize: 10, fontFamily: 'Orbitron' },
    curBtn: { background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 6, fontWeight: 700, fontFamily: 'Orbitron' },
    refreshBtn: { background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 6 },
    tabsRow: { display: 'flex', gap: 8, padding: '16px 16px 0', overflowX: 'auto', marginBottom: 16 },
    tabBtn: { padding: '10px 16px', borderRadius: 4, fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid #1a1a1c', fontFamily: 'Orbitron', background: 'transparent' },
    productCard: { display: 'flex', padding: 14, margin: '0 16px 12px', background: 'rgba(255,255,255,0.01)', borderRadius: 10, border: '1px solid #1a1a1c', position: 'relative', cursor: 'pointer' },
    imgContainer: { position: 'relative', width: 80, height: 80, flexShrink: 0 },
    productImg: { width: '100%', height: '100%', borderRadius: 6, objectFit: 'cover', background: '#111' },
    qtyBadge: { position: 'absolute', top: -5, left: -5, background: '#00f2ff', color: '#000', width: 22, height: 22, borderRadius: 4, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    typeLabel: { fontSize: 8, color: '#555', letterSpacing: 1, fontFamily: 'Orbitron', fontWeight: 700 },
    metaBadge: { fontSize: 8, color: '#888', background: '#111', padding: '2px 6px', borderRadius: 3, border: '1px solid #222', fontFamily: 'Orbitron' },
    productName: { fontSize: 14, fontWeight: 600, color: '#fff', margin: '4px 0 0' },
    statusBadge: { position: 'absolute', bottom: 14, right: 14, fontSize: 7, padding: '4px 8px', borderRadius: 4, fontWeight: 700, fontFamily: 'Orbitron' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(5px)' },
    modalContent: { background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24, maxHeight: '95vh', overflowY: 'auto' },
    photoGallery: { display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 24 },
    photoThumb: { width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid #1a1a1c' },
    photoAddBtn: { width: 100, height: 100, borderRadius: 8, border: '1px dashed #00f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#00f2ff', background: 'rgba(0,242,255,0.02)' },
    photoDeleteBtn: { position: 'absolute', top: -5, right: -5, background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer' },
    formRow: { display: 'flex', gap: 12, marginBottom: 16 },
    hubLabel: { display: 'block', fontSize: 8, fontWeight: 700, color: '#555', marginBottom: 6, fontFamily: 'Orbitron', letterSpacing: 1 },
    hubInput: { width: '100%', padding: '14px', background: '#111', border: '1px solid #1a1a1c', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'Inter' },
    retailHero: { width: '100%', padding: '20px', background: '#0a0a0c', border: '1px solid #00f2ff', borderRadius: 10, color: '#00f2ff', textAlign: 'center', fontSize: 32, fontWeight: 700, fontFamily: 'Orbitron', outline: 'none' },
    backBtn: { flex: 1, padding: 16, background: '#1a1a1c', color: '#666', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 10, fontFamily: 'Orbitron' },
    deleteBtn: { padding: 16, background: 'rgba(255,77,77,0.05)', color: '#ff4d4d', borderRadius: 8, border: '1px solid rgba(255,77,77,0.2)' },
    syncBtn: { flex: 2, padding: 16, background: '#00f2ff', color: '#000', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 10, fontFamily: 'Orbitron' },
    terminalContainer: { background: '#0a0a0c', border: '1px solid #1a1a1c', borderRadius: 20, padding: '35px 25px 25px', width: '100%', maxWidth: 380, textAlign: 'center', position: 'relative' },
    closeIconBtn: { position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#333', fontSize: 24, cursor: 'pointer' },
    terminalTitle: { fontFamily: 'Orbitron', fontSize: 11, color: '#00f2ff', marginBottom: 24, letterSpacing: 2, fontWeight: 700 },
    terminalTabs: { display: 'flex', gap: 4, background: '#111', padding: 4, borderRadius: 8, marginBottom: 24 },
    terminalTabBtn: { flex: 1, padding: 12, border: 'none', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'Orbitron' },
    terminalDisplay: { background: 'rgba(0,242,255,0.01)', padding: 30, borderRadius: 12, border: '1px solid #1a1a1c' },
    initiateBtn: { width: '100%', padding: 18, marginTop: 24, background: '#00f2ff', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontFamily: 'Orbitron', fontSize: 11 },
    abortBtn: { padding: 16, background: '#1a1a1c', color: '#666', border: 'none', borderRadius: 10, fontWeight: 700, fontFamily: 'Orbitron', fontSize: 10 },
    dialBtn: { padding: 16, background: '#00ff88', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontFamily: 'Orbitron', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 },
    bottomDiscardBtn: { width: '100%', padding: 12, marginTop: 15, background: 'transparent', color: '#222', border: 'none', fontSize: 9, fontFamily: 'Orbitron', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);