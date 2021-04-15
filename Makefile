PUBLISHSRV=rthion@connect.liris.cnrs.fr
PUBLISHPATH=/home-membres/rthion/files/Communication/Timeline/

BUILDER=latexmk
BUILDER_OPT=-time -pdf

build: one_card_by_page.pdf nine_cards_by_page.pdf

one_card_by_page.pdf: one_card_by_page.tex
	$(BUILDER) $(BUILDER_OPT) $<

nine_cards_by_page.pdf: nine_cards_by_page.tex
	$(BUILDER) $(BUILDER_OPT) $<

test_one_card_by_page.pdf: test_one_card_by_page.tex
	$(BUILDER) $(BUILDER_OPT) $<

test_nine_cards_by_page.pdf: test_nine_cards_by_page.tex
	$(BUILDER) $(BUILDER_OPT) $<

images: 
	convert -density 300 one_card_by_page.pdf ./img/cards.png

clean:
	latexmk -c

push: one_card_by_page.pdf nine_cards_by_page.pdf
	scp -p one_card_by_page.pdf $(PUBLISHSRV):$(PUBLISHPATH)
	scp -p nine_cards_by_page.pdf $(PUBLISHSRV):$(PUBLISHPATH)


