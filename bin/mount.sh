
#!/usr/bin/env bash

# open a js/xpi/zip file in browser for auto detection, either by tampermonkey
# or addon manager, so it can be updated to new version

if [[ ! $1 ]]; then
	echo "path to the userscript not provided"
	exit 1
fi

current_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
path=$(readlink -f "$current_dir/$1")
script_path="${path/\/d/d:}"

echo "opening: $script_path"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
	command "/c/Program Files/Firefox Nightly/firefox.exe" --new-tab "file:\\$script_path"
	exit
fi

# windows
if [[ "$OSTYPE" == "msys" ]]; then
	command "C:\Program Files\Firefox Nightly\firefox.exe" --new-tab "file:\\$script_path"
	exit
fi

