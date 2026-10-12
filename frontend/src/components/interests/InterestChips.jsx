import { INTEREST_CATALOG, toggleInterest } from "../../utils/interests";
import "./InterestChips.css";

const InterestChips = ({
  value = [],
  onChange,
  label = "Intereses",
  hint = "",
}) => (
  <div className="interest-chips">
    {label ? <p className="interest-chips__label">{label}</p> : null}
    {hint ? <p className="interest-chips__hint">{hint}</p> : null}
    <div className="interest-chips__row">
      {INTEREST_CATALOG.map((item) => {
        const active = value.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`interest-chip${active ? " is-on" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange?.(toggleInterest(value, item.id));
            }}
            aria-pressed={active}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default InterestChips;
