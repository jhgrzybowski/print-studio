import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { Select as RSelect, Tooltip as RTooltip } from "radix-ui";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";

export const ease = [0.25, 1, 0.5, 1];
export const tween = { duration: 0.22, ease };

/* ---------- Tooltip ---------- */
export function Tip({ label, side = "top", children, disabled }) {
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
export const IconKey = forwardRef(function IconKey(
  { label, icon: Icon, variant = "plain", size = "md", pressed, tipSide, className = "", ...rest },
  ref,
) {
  return (
    <Tip label={label} side={tipSide}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        className={`ikey ikey--${variant} ikey--${size} ${pressed ? "is-on" : ""} ${className}`}
        {...rest}
      >
        <Icon size={size === "sm" ? 16 : 18} strokeWidth={1.5} aria-hidden />
      </button>
    </Tip>
  );
});

/* ---------- Text button, kept for the few places a word is clearer than an icon ---------- */
export const Button = forwardRef(function Button({ variant = "raised", children, className = "", busy, ...rest }, ref) {
  return (
    <button ref={ref} type="button" className={`btn btn--${variant} ${busy ? "is-busy" : ""} ${className}`} {...rest}>
      {children}
    </button>
  );
});

/* ---------- Status dot ---------- */
export function Dot({ tone = "muted", pulse }) {
  return <span className={`dot tone-${tone} ${pulse ? "dot--pulse" : ""}`} aria-hidden />;
}

/* ---------- Segmented control ---------- */
export function Segmented({ value, onChange, options, label, disabled, iconOnly, layoutKey }) {
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
      className={`seg ${iconOnly ? "seg--icons" : ""} ${disabled ? "is-disabled" : ""}`}
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
            aria-label={iconOnly ? o.label : undefined}
            tabIndex={active ? 0 : -1}
            disabled={disabled || o.disabled}
            className={`seg__opt ${active ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {active && <motion.span layoutId={`seg-${group}`} className="seg__thumb" transition={tween} aria-hidden />}
            <span className="seg__content">
              {Icon && <Icon size={17} strokeWidth={1.5} aria-hidden />}
              {!iconOnly && <span>{o.label}</span>}
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
export function Stepper({ value, onChange, min = 1, max = 99, label = "Copies", disabled }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit(v) {
    const n = Math.min(max, Math.max(min, parseInt(v, 10) || min));
    setDraft(String(n));
    if (n !== value) onChange(n);
  }

  return (
    <div className={`stepper ${disabled ? "is-disabled" : ""}`} role="group" aria-label={label}>
      <button type="button" className="stepper__key" aria-label={`Fewer ${label.toLowerCase()}`} disabled={disabled || value <= min} onClick={() => commit(value - 1)}>
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
      <button type="button" className="stepper__key" aria-label={`More ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => commit(value + 1)}>
        <Plus size={14} strokeWidth={1.6} aria-hidden />
      </button>
    </div>
  );
}

/* ---------- Select ---------- */
export function Select({ value, onChange, groups, label, disabled, placeholder = "Choose" }) {
  // groups: [{ label?, items: [{ value, label }] }]
  const current = groups.flatMap((g) => g.items).find((i) => i.value === value);
  return (
    <RSelect.Root value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <RSelect.Trigger className="select" aria-label={label}>
        <RSelect.Value placeholder={placeholder}>{current?.label}</RSelect.Value>
        <RSelect.Icon className="select__chev">
          <ChevronDown size={14} strokeWidth={1.6} />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="menu" position="popper" sideOffset={6} align="end" collisionPadding={12}>
          <RSelect.Viewport className="menu__viewport">
            {groups.map((g, gi) => (
              <RSelect.Group key={gi}>
                {g.label && <RSelect.Label className="menu__label">{g.label}</RSelect.Label>}
                {g.items.map((it) => (
                  <RSelect.Item key={it.value} value={it.value} className="menu__item">
                    <RSelect.ItemText>{it.label}</RSelect.ItemText>
                    <RSelect.ItemIndicator className="menu__check">
                      <Check size={14} strokeWidth={1.8} />
                    </RSelect.ItemIndicator>
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

/* ---------- Row: label left, control right ---------- */
export function Row({ label, htmlFor, children, className = "" }) {
  return (
    <div className={`row ${className}`}>
      {htmlFor ? (
        <label className="row__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="row__label">{label}</span>
      )}
      <div className="row__control">{children}</div>
    </div>
  );
}

/* ---------- Print key: the only liquid-metal object ---------- */
export function PrintKey({ icon: Icon, label, onClick, disabled, working, size = 48 }) {
  return (
    <Tip label={label}>
      <motion.button
        type="button"
        aria-label={label}
        className={`print-key ${working ? "is-working" : ""}`}
        style={{ "--size": `${size}px` }}
        onClick={onClick}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        transition={{ duration: 0.12, ease }}
      >
        <span className="print-key__rim" aria-hidden />
        <span className="print-key__core" aria-hidden>
          <Icon size={Math.round(size * 0.4)} strokeWidth={1.5} />
        </span>
      </motion.button>
    </Tip>
  );
}
