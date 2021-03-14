#
# Copyright (C) 2017 Guido Berhoerster <guido+tab-mover@berhoerster.name>
#
# Permission is hereby granted, free of charge, to any person obtaining
# a copy of this software and associated documentation files (the
# "Software"), to deal in the Software without restriction, including
# without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so, subject to
# the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
# CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
# TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#

NAME =		tab-mover
VERSION =	8
EXT_NAME =	$(subst -,_,$(NAME))-$(VERSION)

INKSCAPE := 	inkscape
INFOZIP :=	zip
SED :=		sed

BITMAP_ICONS =	icons/tab-mover-48.png \
		icons/tab-mover-96.png
DIST_FILES =	manifest.json \
		background.js \
		COPYING \
		NEWS \
		README \
		$(wildcard _locales/*/messages.json) \
		$(BITMAP_ICONS)

.DEFAULT_TARGET = all

.PHONY: all extension clean clobber

all: extension

extension: $(EXT_NAME).zip

$(EXT_NAME).zip: $(DIST_FILES)
	$(INFOZIP) $@ $^

define generate-icon-rule
$1: $(1:%-$(lastword $(subst -, ,$1))=%.svg)
	size=$(lastword $(subst -, ,$(basename $1))); \
	    $(INKSCAPE) -w $$$${size} -h $$$${size} -o $$@ $$<
endef

$(foreach icon,$(BITMAP_ICONS),$(eval $(call generate-icon-rule,$(icon))))

manifest.json: manifest.json.in
	$(SED) 's|@VERSION@|$(VERSION)|g' $< >$@

clean:
	-rm -f $(BITMAP_ICONS) manifest.json

clobber: clean
