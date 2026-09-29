import { forwardRef, useId, useRef, useState, useEffect } from "react";
import { motion, useAnimate } from "motion/react";
import { Select as RSelect, Switch as RSwitch, Tooltip as RTooltip } from "radix-ui";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";

export const spring = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 };
export const softSpring = { type: "spring", stiffness: 260, damping: 30 };

/* ---------- Tooltip ---------- */
export function Tip({ label, side = "top", children, disabled }) {
  if (disabled || !label) return children;
  return (
    <RTooltip.Root delayDuration={450}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content className="tip" side={side} sideOffset={8} collisionPadding={10}>
          {label}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

/* ---------- Keys (buttons) ---------- */
export const Key = forwardRef(function Key(
  { variant = "raised", size = "md", icon: Icon, children, className = "", busy, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`key key--${variant} key--${size} ${busy ? "is-busy" : ""} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="key__icon" size={size === "sm" ? 15 : 17} strokeWidth={1.8} aria-hidden />}
      {children && <span className="key__label">{children}</span>}
    </button>
  );
});

export const IconKey = forwardRef(function IconKey({ label, icon: Icon, variant = "ghost", size = "md", tipSide, ...rest }, ref) {
  return (
    <Tip label={label} side={tipSide}>
      <button ref={ref} type="button" aria-label={label} className={`ikey ikey--${variant} ikey--${size}`} {...rest}>
        <Icon size={size === "sm" ? 16 : 18} strokeWidth={1.8} aria-hidden />
      </button>
    </Tip>
  );
});

/* ---------- Segmented control ---------- */
export function Segmented({ value, onChange, options, label, disabled, size = "md", layoutKey }) {
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
      const i = options.indexOf(next);
      refs.current[i]?.focus();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`seg seg--${size} ${disabled ? "is-disabled" : ""}`}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={String(o.value)}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled || o.disabled}
            title={o.title}
            className={`seg__opt ${active ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {active && (
              <motion.span layoutId={`seg-${group}`} className="seg__thumb" transition={spring} aria-hidden />
            )}
            <span className="seg__content">
              {Icon && <Icon size={15} strokeWidth={1.8} aria-hidden />}
              {o.label && <span>{o.label}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Copies stepper (chrome + key) ---------- */
export function Stepper({ value, onChange, min = 1, max = 99, label = "Copies", disabled }) {
  const [draft, setDraft] = useState(String(value));
  const [scope, animate] = useAnimate();
  const first = useRef(true);
  useEffect(() => {
    setDraft(String(value));
    // Roll the number in without remounting the input, so focus survives arrow keys.
    if (first.current) first.current = false;
    else if (scope.current) animate(scope.current, { y: [6, 0], opacity: [0.4, 1] }, spring);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function commit(v) {
    const n = Math.min(max, Math.max(min, parseInt(v, 10) || min));
    setDraft(String(n));
    if (n !== value) onChange(n);
  }

  return (
    <div className={`stepper ${disabled ? "is-disabled" : ""}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__key"
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={disabled || value <= min}
        onClick={() => commit(value - 1)}
      >
        <Minus size={18} strokeWidth={1.6} aria-hidden />
      </button>
      <div className="stepper__value">
        <input
          ref={scope}
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
      </div>
      <button
        type="button"
        className="stepper__key stepper__key--chrome"
        aria-label={`More ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => commit(value + 1)}
      >
        <Plus size={18} strokeWidth={1.6} aria-hidden />
      </button>
    </div>
  );
}

/* ---------- Select ---------- */
export function Select({ value, onChange, groups, label, disabled, placeholder = "Choose" }) {
  // groups: [{ label?, items: [{ value, label }] }]
  const all = groups.flatMap((g) => g.items);
  const current = all.find((i) => i.value === value);
  return (
    <RSelect.Root value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <RSelect.Trigger className="select" aria-label={label}>
        <RSelect.Value placeholder={placeholder}>{current?.label}</RSelect.Value>
        <RSelect.Icon className="select__chev">
          <ChevronDown size={16} strokeWidth={1.8} />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="menu select__menu" position="popper" sideOffset={6} collisionPadding={12}>
          <RSelect.Viewport className="select__viewport">
            {groups.map((g, gi) => (
              <RSelect.Group key={gi}>
                {g.label && <RSelect.Label className="menu__label">{g.label}</RSelect.Label>}
                {g.items.map((it) => (
                  <RSelect.Item key={it.value} value={it.value} className="menu__item">
                    <RSelect.ItemText>{it.label}</RSelect.ItemText>
                    <RSelect.ItemIndicator className="menu__check">
                      <Check size={15} strokeWidth={2} />
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

/* ---------- Switch ---------- */
export function Switch({ checked, onChange, label, disabled, id }) {
  return (
    <RSwitch.Root id={id} className="switch" checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label}>
      <RSwitch.Thumb className="switch__thumb" />
    </RSwitch.Root>
  );
}

/* ---------- Field row ---------- */
export function Field({ label, hint, children, inline, htmlFor }) {
  return (
    <div className={`field ${inline ? "field--inline" : ""}`}>
      <div className="field__head">
        {htmlFor ? (
          <label className="field__label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <span className="field__label">{label}</span>
        )}
        {hint && <span className="field__hint">{hint}</span>}
      </div>
      <div className="field__control">{children}</div>
    </div>
  );
}

/* ---------- Chrome print key ---------- */
export function ChromeKey({ icon: Icon, label, onClick, disabled, working, size = 60, className = "" }) {
  return (
    <Tip label={label}>
      <motion.button
        type="button"
        aria-label={label}
        className={`chrome-key ${working ? "is-working" : ""} ${className}`}
        style={{ "--size": `${size}px` }}
        onClick={onClick}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        transition={spring}
      >
        <span className="chrome-key__ring" aria-hidden />
        <span className="chrome-key__core" aria-hidden>
          <Icon size={Math.round(size * 0.36)} strokeWidth={1.7} />
        </span>
      </motion.button>
    </Tip>
  );
}
