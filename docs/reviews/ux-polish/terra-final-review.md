# Terra final UX recheck

Verdict: INCOMPLETE — do not treat this as approval. No confirmed material product defect was established. The automated step labels in results.json denote completed script actions, not full case verdicts; this report takes precedence.

- A: INCOMPLETE. At 900 and 861 × 800 bottom control bounds were in viewport; next/previous and zoom in/out clicks did not change document scroll. Pages trigger regained focus after Escape (followup.json). Not every topbar/bottom control was clicked and a changed preference was not verified.
- B: INCOMPLETE. With history options overridden before load, the reprint displayed A4, Black & white and One-sided. Driver was expanded and a panel stayed open through shrink; settled 1280 bounds were inside viewport. Landscape and Tab were exercised in the original run, but focus landed on a radio in the panel, so closure/logical focus was not established. Original first reprint was invalid because fixture state was overridden after the history was fetched.
- C: INCOMPLETE. Adjacent fields hovered and the top-level paper select was selected and escaped twice; body pointer-events returned auto and zoom remained clickable. Nested select, selected-value tooltip assertion, keyboard opening and reduced-motion Landscape were not verified; responsive toolbar uses different controls at this width and attempted locators timed out.
- D: INCOMPLETE. Page 2 / 125% persisted through Settings, Polish→English→Polish, and return (D-language.json). History, archive, home, hidden R and new-file reset were not all asserted end-to-end.
- E: PASS on fixture. Invalid page 9 displayed the three-page error, corrected to 1-2; 2 copies and long-edge saved to fixture preferences, changed and reset to 2 copies. Print payload contained pages 1-2, copies 2 and long-edge; UI showed W kolejce, Drukowanie and Wydrukowane (results.json).
- F: INCOMPLETE. Opened phone settings, changed paper to Wide Postcard and returned; document width was 360px. Reachability of every control and overflow with all relevant sheet/dropdown states were not verified.

Console/page/request failure collectors in the initial case run recorded no errors. Followup scripts did not instrument all error collectors. Headless Chrome mobile emulation and in-memory API fixture only; no physical touch, live account or printer verification.
