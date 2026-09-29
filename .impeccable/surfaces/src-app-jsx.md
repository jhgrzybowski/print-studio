---
version: 2
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: []
---

# Surface: Print Studio app shell (auth, workspace, history, settings)

**Context.**
- Mode: Operate.
- Audience: a household on the LAN, printing to one Canon MG5350.
- Job: sign in, drop a file, check the sheet, set the output, print, and watch the job finish.

**Constraints.**
- Neumorphic with liquid-metal detail, light and dark themes, and five accents.
- A sidebar holding history, profile and settings, plus a main workspace.
- Few words, icon-first controls, and no stacked panes.
- Banned: cream or off-white grounds, italic accent words, numbered section labels, monospace labels, pill buttons, and anything borrowed from another app.

## Direction contract

**Thesis.**
- One quiet plane with a single floating sheet of paper.
- Structure comes from space, alignment and hairlines, never from boxes inside boxes.
- It turns away from two things: the settings form stacked in cards, and the chat-app clone.

**Own world.**
- A cool tinted plane. Keys are softly raised circles, or 8 to 10 px rectangles, that sink when active.
- The paper is the only strongly lifted object.
- Liquid metal appears only on the print key, which is used identically in the dock and in history.
- Geist Variable. lucide icons at 1.5 stroke, plus matching custom glyphs for color, sides and quality.

**Story.**
1. The empty canvas shows a sheet outline waiting to be filled, and the dock reports the printer state.
2. The user drops a file anywhere. The sheet fills with the real page, sized to the paper.
3. They adjust the inspector rows, and the sheet reacts: it turns, desaturates, and fans out copies.
4. The foot line confirms the sheet count, and the chrome key sends the job.
5. A slim progress strip above the dock walks through the stages until the job is done.

**First viewport.**
- A 248 px sidebar: mark and a new-print key, search, one-line history rows, then the printer dot, avatar and settings at the foot.
- The canvas shows a centred blank sheet and one short line of copy.
- The dock sits below: attach key, status text and the print key.
- Once a file is loaded, a 296 px inspector opens on the right, separated only by a hairline.
