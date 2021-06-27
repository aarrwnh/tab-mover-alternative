import { settings } from "./src/settings";
import initTabMover from "./src/components/tabMover";
import initBookmarkTab from "./src/components/bookmarkTab";
import initImageSaver from "./src/components/imageSaver";

initTabMover(settings);
initBookmarkTab(settings);
initImageSaver(settings);
