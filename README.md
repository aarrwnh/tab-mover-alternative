# tab-mover-alternative

This is a modified version of [*Tab Mover*](https://code.guido-berhoerster.org/addons/firefox-addons/tab-mover/) addon for personal use only (i.e. as unsigned addon).


## Differences from the original

- added options page ([#4](https://github.com/wenereth-arkhilmor/tab-mover-alternative/pull/4))
- toggle option for the unneeded behaviour added in the original addon v0.8:
  switch to tab after move to window - which is counter-intuitive 100% of
  time, e.g. when watching a video (multitasking)
- move tabs with a one-click toolbar icon (which made context menu kind-of
  obsolete)
- quickly switch to previously active tab with shortcut
- always move specific containers to a new window
- implemented bookmark and image saver (because why not?) [#4]


## Tab mover

Quickly move tabs between windows using just a keyboard, or by clicking on
toolbar icon (also, not recommended, via the context menu). It can move tabs
between two normal windows, two windows in incognito mode and from a normal
window to an window in incognito mode.

Since it is not possible to directly move tabs between normal windows and
windows in incognito mode, addon can perform the equivalent of moving a tab by
closing and reopening such tabs in another window, via the context menu only.

*(modified original description)*


## Image saver

Implements more or less the same logic as the old XUL addon [Bazzacuda Image Saver
Plus](http://konbu.crz.jp/) (at least to the extent I used and needed it).

features:
- prefer to save from selected tabs (i.e. more than 1 tab)


## Bookmark saver

Save currently selected tab as a "URL Shortcut File (.url)". It tries to save
text from several html meta tags, i.e. description and twitter:description, and
datePublished (appended to filename).


## Default Shortcut List

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


## TODO
- move all highlighted tabs to end position, not just a single one
- don't complete/close tab if response is other than 200? (`Error: SERVER_FAILED`)
- reorganize options page
- integrate locales with new stuff?
- rename addon, since it doesn't just move tabs anymore: firefox-tab-tools?
