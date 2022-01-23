# tab-mover-alternative

This is a modified version of [*Tab
Mover*](https://code.guido-berhoerster.org/addons/firefox-addons/tab-mover/)
addon for personal use only.

## Differences from the original:

- added options page (svelte
  [[#4](https://github.com/wenereth-arkhilmor/tab-mover-alternative/pull/4)])
- toggle option for the unneeded behaviour added in v0.8: switch to tab after
  move to window -- which is counterintuive 100% of time, e.g. when watching a
  video (multitasking)
- move tabs with a one-click toolbar icon (which made right click menu kind-of
  obsolete)
- quickly switch to previously active tab with shortcut
- always move specific containers to a new window
- implemented bookmark and image saver (because why not?) [#4]


### Image saver

Implements more or less the same logic as the old XUL addon [Bazzacuda Image Saver
Plus](http://konbu.crz.jp/) (at least to the extent I used and needed
it). It can only be triggered with a key shortcut.


### Bookmark saver

It can only be triggered with a key shortcut.


### Default Shortcut List

Action | Shortcut
-------|----------
Switch back to previously active tab | Ctrl+Alt+9
Move currently selected tabs | Ctrl+Alt+8
Go to last recently opened tab (not navigated) | Ctrl+Alt+7
Jump by x tabs to left | Ctrl+Alt+4
Jump by x tabs to right | Ctrl+Alt+6
Move current tab last | Ctrl+Alt+5
Sort selected tabs by title | Ctrl+Alt+3
Find and save images in the current window | Ctrl+Alt+2
Save currently opened tab as bookmark | Ctrl+Alt+1


### TODO:

- fix locales?
- add notification if nothing is selected when sorting tabs with ctrlshift3
- update badge count when saving images?
- img-saver: save only when any tabs are selected (if 1 tab is selected it will
  save just that)


### Build

```
yarn build
```

### Debug/Run

```
yarn debug
```
