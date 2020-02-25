PUBLISHSRV=rthion@connect.liris.cnrs.fr
PUBLISHPATH=/home-membres/rthion/files/Communication/Timeline/

build: one_card_by_page.pdf nine_cards_by_page.pdf

one_card_by_page.pdf: one_card_by_page.tex
	rubber -v --warn all --force --pdf one_card_by_page.tex

nine_cards_by_page.pdf: nine_cards_by_page.tex
	rubber -v --warn all --force --pdf nine_cards_by_page.tex

test_one_card_by_page.pdf: test_one_card_by_page.tex
	rubber -v --warn all --force --pdf test_one_card_by_page.tex

test_nine_cards_by_page.pdf: test_nine_cards_by_page.tex
	rubber -v --warn all --force --pdf test_nine_cards_by_page.tex

images: 
	convert -density 300 one_card_by_page.pdf ./img/cards.png

push: one_card_by_page.pdf nine_cards_by_page.pdf
	scp -p one_card_by_page.pdf $(PUBLISHSRV):$(PUBLISHPATH)
	scp -p nine_cards_by_page.pdf $(PUBLISHSRV):$(PUBLISHPATH)


