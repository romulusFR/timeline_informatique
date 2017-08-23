build: one_card nine_cards
#test_one_card test_nine_cards 


one_card: one_card_by_page.tex
	rubber -v --warn all --force --pdf one_card_by_page.tex

nine_cards: nine_cards_by_page.tex
	rubber -v --warn all --force --pdf nine_cards_by_page.tex

test_one_card: test_one_card_by_page.tex
	rubber -v --warn all --force --pdf test_one_card_by_page.tex

test_nine_cards: test_nine_cards_by_page.tex
	rubber -v --warn all --force --pdf test_nine_cards_by_page.tex

images: one_card_by_page.pdf
	convert -density 300 one_card_by_page.pdf ./images/cards.png
