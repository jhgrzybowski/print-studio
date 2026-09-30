import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Select as RSelect, Tooltip as RTooltip } from "radix-ui";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { t, tn } from "../i18n/index.js";

// Strong ease-out: instant response, long soft landing.
export const ease = [0.23, 1, 0.32, 1];
export const tween = { duration: 0.2, ease };
export const drawerEase = [0.32, 0.72, 0, 1];

export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = IS_MAC ? "⌘" : "Ctrl ";

/**
 * Liquid metal: one passive listener moves the specular highlight on every `.metal`
 * surface. The CSS registers --mx/--my so the highlight trails the pointer.
 */
export function useLiquidMetal() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let last = null;
    const paint = () => {
      frame = 0;
      for (const el of document.querySelectorAll(".metal")) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        el.style.setProperty("--mx", `${(((last.x - r.left) / r.width) * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(((last.y - r.top) / r.height) * 100).toFixed(1)}%`);
      }
    };
    const onMove = (e) => {
      last = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}

/* ---------- Tooltip ---------- */
export function Tip({ label, side = "bottom", children, disabled }) {
  if (disabled || !label) return children;
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content className="tip" side={side} sideOffset={8} collisionPadding={10}>
          {label}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/* ---------- Icon key: the default control ---------- */
export const IconKey = forwardRef(function IconKey({ label, icon: Icon, variant = "plain", size = "md", pressed, tipSide, className = "", ...rest }, ref) {
  return (
    <Tip label={label} side={tipSide}>
      <button ref={ref} type="button" aria-label={label} aria-pressed={pressed} className={`ikey ikey--${variant} ikey--${size} ${pressed ? "is-on" : ""} ${className}`} {...rest}>
        <Icon size={size === "sm" ? 16 : 18} strokeWidth={1.5} aria-hidden />
      </button>
    </Tip>
  );
});

/* ---------- Text button, for the few places a word is clearer than an icon ---------- */
export const Button = forwardRef(function Button({ variant = "raised", children, className = "", busy, ...rest }, ref) {
  return (
    <button ref={ref} type="button" className={`btn btn--${variant} ${variant === "metal" ? "metal" : ""} ${busy ? "is-busy" : ""} ${className}`} {...rest}>
      {children}
    </button>
  );
});

/* ---------- Status dot ---------- */
export function Dot({ tone = "muted", pulse }) {
  return <span className={`dot tone-${tone} ${pulse ? "dot--pulse" : ""}`} aria-hidden />;
}

/* ---------- Segmented control: an inset well with a chrome slug ---------- */
export function Segmented({ value, onChange, options, label, disabled, iconOnly, layoutKey, className = "" }) {
  const autoId = useId();
  const group = layoutKey || autoId;
  const refs = useRef([]);
  const enabled = options.filter((o) => !o.disabled);

  function onKeyDown(e) {
    const idx = enabled.findIndex((o) => o.value === value);
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = enabled[(idx + 1) % enabled.length];
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = enabled[(idx - 1 + enabled.length) % enabled.length];
    if (next) {
      e.preventDefault();
      onChange(next.value);
      refs.current[options.indexOf(next)]?.focus();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`seg ${iconOnly ? "seg--icons" : ""} ${disabled ? "is-disabled" : ""} ${className}`}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        const Icon = o.icon;
        const button = (
          <button
            key={String(o.value)}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly || o.short ? o.label : undefined}
            tabIndex={active ? 0 : -1}
            disabled={disabled || o.disabled}
            className={`seg__opt ${active ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                className="seg__thumb metal"
                transition={document.documentElement.dataset.kbd != null ? { duration: 0 } : { duration: 0.2, ease }}
                aria-hidden
              />
            )}
            <span className="seg__content">
              {Icon && <Icon size={17} strokeWidth={1.5} aria-hidden />}
              {!iconOnly && <span className={o.short ? "seg__text seg__text--full" : "seg__text"}>{o.label}</span>}
              {!iconOnly && o.short && (
                <span className="seg__text seg__text--short" aria-hidden>
                  {o.short}
                </span>
              )}
            </span>
          </button>
        );
        return iconOnly ? (
          <Tip key={String(o.value)} label={o.label}>
            {button}
          </Tip>
        ) : (
          button
        );
      })}
    </div>
  );
}

/* ---------- Stepper ---------- */
/** decLabel / incLabel name the keys; languages that inflect need them spelled out ("Mniej kopii"). */
export function Stepper({ value, onChange, min = 1, max = 99, label, decLabel, incLabel, icon: Icon, disabled }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit(v) {
    const n = Math.min(max, Math.max(min, parseInt(v, 10) || min));
    setDraft(String(n));
    if (n !== value) onChange(n);
  }

  const body = (
    <div className={`stepper ${disabled ? "is-disabled" : ""}`} role="group" aria-label={label}>
      {Icon && <Icon className="stepper__lead" size={16} strokeWidth={1.5} aria-hidden />}
      <button type="button" className="stepper__key" aria-label={decLabel || t("Fewer")} disabled={disabled || value <= min} onClick={() => commit(value - 1)}>
        <Minus size={14} strokeWidth={1.6} aria-hidden />
      </button>
      <input
        className="stepper__input"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
          if (e.key === "ArrowUp") (e.preventDefault(), commit(value + 1));
          if (e.key === "ArrowDown") (e.preventDefault(), commit(value - 1));
        }}
      />
      <button type="button" className="stepper__key" aria-label={incLabel || t("stepper|More")} disabled={disabled || value >= max} onClick={() => commit(value + 1)}>
        <Plus size={14} strokeWidth={1.6} aria-hidden />
      </button>
    </div>
  );
  return Icon ? <Tip label={label}>{body}</Tip> : body;
}

/* ---------- Select: a raised field that opens a dark menu ---------- */
export function Select({ value, onChange, groups, label, disabled, placeholder, icon, collapse, className = "" }) {
  // groups: [{ label?, items: [{ value, label, sub?, icon? }] }]
  const current = groups.flatMap((g) => g.items).find((i) => i.value === value);
  // Items that carry their own glyph lend it to the trigger, so the field shows what is chosen.
  const Icon = current?.icon || icon;
  const trigger = (
    <RSelect.Trigger className={`field ${collapse ? `field--${collapse === true ? "collapse" : collapse}` : ""} ${className}`} aria-label={label}>
      {Icon && <Icon className="field__lead" size={17} strokeWidth={1.5} aria-hidden />}
      <span className="field__val">
        <RSelect.Value placeholder={placeholder ?? t("Choose")}>{current?.label}</RSelect.Value>
      </span>
      <RSelect.Icon className="field__chev">
        <ChevronDown size={14} strokeWidth={1.6} />
      </RSelect.Icon>
    </RSelect.Trigger>
  );
  return (
    <RSelect.Root value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      {Icon ? <Tip label={label}>{trigger}</Tip> : trigger}
      <RSelect.Portal>
        <RSelect.Content className="menu" position="popper" sideOffset={6} align="start" collisionPadding={12}>
          <RSelect.Viewport className="menu__viewport">
            {groups.map((g, gi) => (
              <RSelect.Group key={gi}>
                {g.label && <RSelect.Label className="menu__label">{g.label}</RSelect.Label>}
                {g.items.map((it) => (
                  <RSelect.Item key={it.value} value={it.value} className="menu__item menu__item--check">
                    <RSelect.ItemIndicator className="menu__check">
                      <Check size={14} strokeWidth={1.8} />
                    </RSelect.ItemIndicator>
                    {it.icon && <it.icon className="menu__glyph" size={16} strokeWidth={1.5} aria-hidden />}
                    <span className="menu__main">
                      <RSelect.ItemText>{it.label}</RSelect.ItemText>
                      {it.sub && <span className="menu__sub">{it.sub}</span>}
                    </span>
                  </RSelect.Item>
                ))}
                {gi < groups.length - 1 && <RSelect.Separator className="menu__sep" />}
              </RSelect.Group>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

/* ---------- Switch: a chrome bead that slides along an inset track ---------- */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      className={`switch ${checked ? "is-on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__bead metal" aria-hidden />
    </button>
  );
}

/* ---------- Row: label left, control right ---------- */
export function Row({ label, hint, htmlFor, children, className = "" }) {
  const text = hint ? (
    <span className="row__text">
      {label}
      <span className="row__hint">{hint}</span>
    </span>
  ) : (
    label
  );
  return (
    <div className={`row ${className}`}>
      {htmlFor ? (
        <label className="row__label" htmlFor={htmlFor}>
          {text}
        </label>
      ) : (
        <span className="row__label">{text}</span>
      )}
      <div className="row__control">{children}</div>
    </div>
  );
}

/**
 * The print slab: polished chrome with a drifting sheen. While sending it becomes a dark
 * well that fills with mercury; on success it shows a check for a moment.
 */
export function PrintButton({ label, icon: Icon, onClick, disabled, state = "idle", shortcut, className = "" }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(state);
  useEffect(() => {
    if (prev.current === "sending" && state === "sent") {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1700);
      prev.current = state;
      return () => clearTimeout(id);
    }
    prev.current = state;
  }, [state]);

  const sending = state === "sending";
  const text = sending ? t("Sending") : flash ? t("print|Sent") : label || t("Print");
  const Lead = flash ? Check : Icon;

  return (
    <button
      type="button"
      className={`print metal ${sending ? "is-sending" : ""} ${flash ? "is-sent" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled && !sending}
      aria-disabled={sending || undefined}
      aria-live="polite"
    >
      <span className="print__fill" aria-hidden />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="print__label"
          initial={{ opacity: 0, filter: "blur(3px)", y: 5 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, filter: "blur(3px)", y: -5 }}
          transition={{ duration: 0.2, ease }}
        >
          {Lead && <Lead size={16} strokeWidth={flash ? 2 : 1.6} aria-hidden />}
          {text}
        </motion.span>
      </AnimatePresence>
      {shortcut && !sending && !flash && (
        <kbd className="print__kbd" aria-hidden>
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
