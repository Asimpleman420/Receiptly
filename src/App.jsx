import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import {
  MAX_ITEMS,
  PRESETS,
  RECEIPT_TYPES,
  THEMES,
  defaultTitle,
  fileNameFor,
  formatReceiptDate,
  getInitialState,
  makeId,
  randomBarcode,
  randomOrderNumber,
  rowsFromPreset,
  validateStoredState,
} from './receipt-utils.js';

const TYPE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const THEME_LABELS = { classic: 'Classic white', dark: 'Dark retro', pastel: 'Pastel' };

function Receipt({ state, receiptRef, barcode, orderNumber, printing }) {
  const shownItems = state.items.filter((item) => item.key.trim() && item.value.trim());
  const barcodeWidth = barcode.reduce((sum, bar) => sum + bar.width + bar.gap, 0);

  return (
    <article
      className={`receipt receipt--${state.theme}${printing ? ' is-printing' : ''}`}
      ref={receiptRef}
      aria-label="Receipt preview"
    >
      <div className="receipt__content">
        <header className="receipt__header">
          <span className="receipt__brand">RECEIPTLY</span>
          <h2>{state.customTitle.trim() || defaultTitle(state.type)}</h2>
          <p>{formatReceiptDate(state.type)}</p>
          {state.name.trim() && <p className="receipt__name">{state.name}</p>}
          {state.showOrder && <p className="receipt__order">ORDER #{orderNumber}</p>}
        </header>

        <div className="receipt__items" aria-label="Receipt items">
          {shownItems.length ? shownItems.map((item) => (
            <div className="receipt__line" key={item.id}>
              <span>{item.key}</span>
              <strong>{item.value}</strong>
            </div>
          )) : <p className="receipt__empty">Add complete items to fill your receipt.</p>}
        </div>

        <div className="receipt__total">
          <strong>TOTAL</strong>
          <strong>{state.finalMessage || '—'}</strong>
        </div>

        <footer className="receipt__footer">
          <p>Thank you, come again</p>
          {state.showBarcode && (
            <svg className="barcode" viewBox={`0 0 ${barcodeWidth} 48`} role="img" aria-label="Decorative barcode" preserveAspectRatio="none">
              {barcode.reduce((result, bar, index) => {
                const x = index ? result.x + barcode[index - 1].width + barcode[index - 1].gap : 0;
                result.nodes.push(<rect key={index} x={x} y={bar.short ? 7 : 0} width={bar.width} height={bar.short ? 34 : 48} />);
                result.x = x;
                return result;
              }, { nodes: [], x: 0 }).nodes}
            </svg>
          )}
          <p className="receipt__website">{state.footer || ' '}</p>
        </footer>
      </div>
    </article>
  );
}

function App() {
  const [state, setState] = useState(getInitialState);
  const [orderNumber, setOrderNumber] = useState(randomOrderNumber);
  const [barcode, setBarcode] = useState(randomBarcode);
  const [printing, setPrinting] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready. Your receipt updates as you type.');
  const receiptRef = useRef(null);
  const imageCache = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setPrinting(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const { items, ...rest } = state;
      localStorage.setItem('receiptly-state', JSON.stringify({
        ...rest,
        items: items.map(({ key, value }) => ({ key, value })),
      }));
    } catch {
      // Storage can be unavailable in privacy modes; the editor remains fully usable.
    }
    imageCache.current = null;
  }, [state]);

  const update = useCallback((patch) => setState((current) => ({ ...current, ...patch })), []);
  const updateItem = useCallback((id, field, value) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item),
    }));
  }, []);

  const addItem = () => {
    if (state.items.length >= MAX_ITEMS) return;
    update({ items: [...state.items, { id: makeId(), key: '', value: '' }] });
  };

  const removeItem = (id) => {
    if (state.items.length <= 1) return;
    update({ items: state.items.filter((item) => item.id !== id) });
  };

  const applyPreset = (name) => {
    const preset = PRESETS[name];
    update({ items: rowsFromPreset(preset), ...(preset.type ? { type: preset.type } : {}) });
    setSelectedPreset(name);
    const label = name === 'student' ? 'Student life' : name === 'developer' ? 'Developer week' : name[0].toUpperCase() + name.slice(1);
    setStatus(`${label} preset applied.`);
  };

  const shuffle = () => {
    setOrderNumber(randomOrderNumber());
    setBarcode(randomBarcode());
    imageCache.current = null;
    setStatus('Order number and barcode shuffled.');
  };

  const printAgain = () => {
    setPrinting(false);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setPrinting(true)));
    window.setTimeout(() => setPrinting(false), 950);
  };

  const prepareImage = useCallback(async () => {
    if (imageCache.current) return imageCache.current;
    if (!receiptRef.current) throw new Error('Receipt preview is not ready.');
    setPrinting(false);
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    try {
      if (document.fonts?.ready) await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 1800)),
      ]);
    } catch {
      // Export continues with the browser's reliable local monospace fallback.
    }
    const blob = await toBlob(receiptRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: state.theme === 'dark' ? '#171914' : state.theme === 'pastel' ? '#fff4f6' : '#fffefa',
    });
    if (!blob) throw new Error('The browser could not create the PNG.');
    imageCache.current = blob;
    return blob;
  }, [state.theme]);

  const downloadBlob = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileNameFor(state.type);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state.type]);

  const runOutput = async (action) => {
    setBusy(true);
    setStatus('Preparing your high-resolution receipt…');
    try {
      const blob = await prepareImage();
      await action(blob);
    } catch (error) {
      setStatus(error?.message || 'Something went wrong. Downloading the PNG may still work.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => runOutput(async (blob) => {
    downloadBlob(blob);
    setStatus('PNG downloaded at 3× resolution.');
  });

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return undefined;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(context.registerTool({
        name: 'configure_receipt',
        title: 'Configure receipt',
        description: 'Update the visible Receiptly receipt with a type, title, summary, and editable line items.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: RECEIPT_TYPES },
            title: { type: 'string', maxLength: 160 },
            summary: { type: 'string', maxLength: 180 },
            items: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'], additionalProperties: false } },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object') throw new Error('Expected a receipt configuration object.');
          const patch = {};
          if (input.type !== undefined) {
            if (!RECEIPT_TYPES.includes(input.type)) throw new Error('Invalid receipt type.');
            patch.type = input.type;
          }
          if (input.title !== undefined) patch.customTitle = String(input.title).slice(0, 160);
          if (input.summary !== undefined) patch.finalMessage = String(input.summary).slice(0, 180);
          if (input.items !== undefined) {
            if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 10) throw new Error('Items must contain 1 to 10 rows.');
            patch.items = input.items.map((item) => ({ id: makeId(), key: String(item.key).slice(0, 120), value: String(item.value).slice(0, 120) }));
          }
          setState((current) => ({ ...current, ...patch }));
          return { updated: true, fields: Object.keys(patch) };
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch {
      // WebMCP is progressive enhancement and never blocks the editor.
    }
    return () => lifecycle.abort();
  }, []);

  const completeCount = useMemo(() => state.items.filter((item) => item.key.trim() && item.value.trim()).length, [state.items]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#main" aria-label="Receiptly home">
          <span className="wordmark__mark" aria-hidden="true">R</span>
          <span>Receiptly</span>
        </a>
        <p>Make your time tangible.</p>
      </header>

      <main id="main" className="workspace">
        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="panel-heading preview-heading">
            <div>
              <span className="eyebrow">Live preview</span>
              <h1 id="preview-title">Your receipt</h1>
            </div>
            <span className="item-count">{completeCount} item{completeCount === 1 ? '' : 's'}</span>
          </div>

          <div className="receipt-stage">
            <Receipt state={state} receiptRef={receiptRef} barcode={barcode} orderNumber={orderNumber} printing={printing} />
          </div>

          <div className="preview-tools" aria-label="Preview controls">
            <button className="button button--quiet" type="button" onClick={shuffle}>Shuffle</button>
            <button className="button button--quiet" type="button" onClick={printAgain}>Print again</button>
          </div>

          <div className="output-actions" aria-label="Image output">
            <button className="button button--primary" type="button" onClick={download} disabled={busy}>Download PNG</button>
          </div>
          <p className="status" role="status" aria-live="polite">{status}</p>
        </section>

        <section className="editor-panel" aria-labelledby="editor-title">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Editor</span>
              <h2 id="editor-title">Shape the story</h2>
            </div>
          </div>

          <div className="field-group">
            <fieldset>
              <legend>Receipt type</legend>
              <div className="segmented">
                {RECEIPT_TYPES.map((type) => (
                  <label key={type}>
                    <input type="radio" name="receipt-type" value={type} checked={state.type === type} onChange={() => update({ type })} />
                    <span>{TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="field">
              <span>Custom title <small>Optional</small></span>
              <input value={state.customTitle} maxLength="160" placeholder={defaultTitle(state.type)} onChange={(event) => update({ customTitle: event.target.value })} />
            </label>

            <label className="field">
              <span>Name or username <small>Optional</small></span>
              <input value={state.name} maxLength="120" placeholder="@username" onChange={(event) => update({ name: event.target.value })} />
            </label>
          </div>

          <div className="editor-section">
            <div className="section-title-row">
              <div>
                <h3>Line items</h3>
                <p>Incomplete rows stay here but won’t appear on the receipt.</p>
              </div>
              <span>{state.items.length}/{MAX_ITEMS}</span>
            </div>
            <div className="preset-row" aria-label="Item presets">
              <button className={selectedPreset === 'normal' ? 'is-active' : ''} type="button" aria-pressed={selectedPreset === 'normal'} onClick={() => applyPreset('normal')}>Normal</button>
              <button className={selectedPreset === 'developer' ? 'is-active' : ''} type="button" aria-pressed={selectedPreset === 'developer'} onClick={() => applyPreset('developer')}>Developer week</button>
              <button className={selectedPreset === 'reading' ? 'is-active' : ''} type="button" aria-pressed={selectedPreset === 'reading'} onClick={() => applyPreset('reading')}>Reading</button>
              <button className={selectedPreset === 'fitness' ? 'is-active' : ''} type="button" aria-pressed={selectedPreset === 'fitness'} onClick={() => applyPreset('fitness')}>Fitness</button>
              <button className={selectedPreset === 'student' ? 'is-active' : ''} type="button" aria-pressed={selectedPreset === 'student'} onClick={() => applyPreset('student')}>Student life</button>
            </div>

            <div className="item-editor">
              {state.items.map((item, index) => (
                <div className="item-row" key={item.id}>
                  <label>
                    <span className="sr-only">Item {index + 1} key</span>
                    <input value={item.key} maxLength="120" placeholder="Key" onChange={(event) => updateItem(item.id, 'key', event.target.value)} />
                  </label>
                  <label>
                    <span className="sr-only">Item {index + 1} value</span>
                    <input value={item.value} maxLength="120" placeholder="Value" onChange={(event) => updateItem(item.id, 'value', event.target.value)} />
                  </label>
                  <button className="icon-button" type="button" aria-label={`Remove item ${index + 1}`} disabled={state.items.length === 1} onClick={() => removeItem(item.id)}>×</button>
                </div>
              ))}
            </div>
            <button className="button button--add" type="button" onClick={addItem} disabled={state.items.length >= MAX_ITEMS}>+ Add item</button>
          </div>

          <div className="field-group editor-section">
            <label className="field">
              <span>Final message</span>
              <input value={state.finalMessage} maxLength="180" onChange={(event) => update({ finalMessage: event.target.value })} />
            </label>

            <fieldset>
              <legend>Receipt theme</legend>
              <div className="theme-grid">
                {THEMES.map((theme) => (
                  <label className={`theme-choice theme-choice--${theme}`} key={theme}>
                    <input type="radio" name="receipt-theme" value={theme} checked={state.theme === theme} onChange={() => update({ theme })} />
                    <span aria-hidden="true"></span>
                    {THEME_LABELS[theme]}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="field">
              <span>Footer website</span>
              <input value={state.footer} maxLength="180" placeholder="yourwebsite.com" onChange={(event) => update({ footer: event.target.value })} />
            </label>

            <div className="toggle-list">
              <label className="toggle">
                <span>Show barcode</span>
                <input type="checkbox" checked={state.showBarcode} onChange={(event) => update({ showBarcode: event.target.checked })} />
              </label>
              <label className="toggle">
                <span>Show order number</span>
                <input type="checkbox" checked={state.showOrder} onChange={(event) => update({ showOrder: event.target.checked })} />
              </label>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>Private by design. Everything stays in this browser.</p>
      </footer>
    </div>
  );
}

export default App;
