build: single

single: card_single.tex
	rubber -v --warn all --force --pdf card_single.tex

all: cards_all.tex
	rubber -v --warn all --force --pdf cards_all.tex

