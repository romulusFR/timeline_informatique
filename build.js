'use strict';

/** *********************************************************************************************************
Le présent projet est en licence Crative Commons BY-NC-SA 3.0, Romuald THION.

Vous devez créditer l'oeuvre, vous n'êtes pas autorisé à faire un usage commercial de cette oeuvre,
tout ou partie du matériel la composant, dans le cas où vous effectuez un remix, que vous transformez,
ou créez à partir du matériel composant l'oeuvre originale, vous devez diffuser l'Oeuvre modifiée dans les même conditions.

https://creativecommons.org/licenses/by-nc-sa/3.0/fr/

Le modèle LaTeX/Tikz est adapté de celui d'Arvid
 https://tex.stackexchange.com/questions/47924/creating-playing-cards-using-tikz
 https://tex.stackexchange.com/questions/243740/print-double-sided-playing-cards
*********************************************************************************************************** */

const debug = require('debug')('timeline');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const fetch = require('node-fetch');
const path = require('path');
const sharp = require('sharp');
const program = require('commander');

// eslint-disable-next-line object-curly-newline
const {
  name,
  version,
  homepage,
  description,
  main,
} = require('./package.json');

// /!\ WARNING /!\ changes on size parameters below HAVE TO BE PROPAGATED TO ./latex/tikzcards.tex as well !

// height of images : (card_height - 2*borders) * 300dpi, here for a poker-sized deck (3.5 in) with border = 3mm
const golden_height = 980; // 980 955;
// width of images : (card_width - 2*borders) * 300dpi, here for a poker-sized deck (2.5 in) with border = 3mm
const golden_width = 680; // 680 655
const golden_ratio = golden_height / golden_width;
// percentage of "visible" width, ie, the width of the card minus the width of the vertical strip and (2) strip paddings
const strip_width_percent = 0.1666;
// a n% threshold to avoid resizing cropping an image if its ratio is between golden_ratio*(1-ratio_threshold) and golden_ratio*(1+ratio_threshold)
const ratio_threshold = 0.02;

// some configuration
const special_path = './special_cards/'; // where special cards are stored
const latex_path = './latex/'; // LaTeX templates are stored
const img_path = './img/'; // where to store downloaded images
const output_path = './deck/'; // where to store generated .tex cards
const latex_one_card_by_page_name = './one_card_by_page.tex'; // main .tex with paper size set to the card
const latex_nine_cards_by_page_name = './nine_cards_by_page.tex'; // main .tex with paper size set to A4, 3x3 cards by page
const rules_front = `${special_path}0_rules_front.tex`; // special "rules" card, front, added to the deck
const rules_back = `${special_path}0_rules_back.tex`; // special "rules" card, back, added to the deck
const blank_card = `${special_path}00_blank.tex`; // special blank card, added to pad A4 paper

// resize images according to their format wrt the ideal one
function resizer(input, output) {
  // see doc https://sharp.pixelplumbing.com/
  const image = sharp(input);
  image.metadata((err, metadata) => {
    if (err) {
      return console.error(err);
    }
    debug(`Image ${input} is ${metadata.width}x${metadata.height}`);
    const ratio = metadata.height / metadata.width;
    const target = {
      width: metadata.width,
      height: metadata.height,
      left: 0,
      top: 0,
      flag: 'normal',
    };

    if (ratio > golden_ratio * (1 + ratio_threshold)) {
      // if the image is too much vertical
      target.height = Math.round(metadata.width * golden_ratio);
      target.top = Math.round(
        (metadata.height - metadata.width * golden_ratio) / 2,
      );
      target.flag = 'vertical';
    }
    if (ratio < golden_ratio * (1 - ratio_threshold)) {
      // if the image is too much horizontal.
      target.width = Math.round(metadata.height / golden_ratio);
      target.left = (metadata.width - metadata.height / golden_ratio) / 2;
      // when the image is too much horizontal we have some room
      // shift the cropped image on the "visible" part of the image (without the vertival strip)
      const strip_width = (strip_width_percent * metadata.height) / golden_ratio;
      const delta = Math.min(strip_width, target.left);
      target.left = Math.round(target.left - delta);
      target.flag = 'horizontal';
    }
    // otherwise, simply proportionnaly resize without cropping
    debug(`Target resizing is ${JSON.stringify(target)}`);

    return image
      .extract(target)
      .resize(golden_width, golden_height)
      .toFile(output, (error, info) => {
        if (error) {
          console.error(
            `Sharp error : ${output} ${JSON.stringify(target)} from ${
              metadata.width
            }x${metadata.height} (${error})`,
          );
        } else {
          debug(`Sharp : ${output} (${JSON.stringify(info.format)})`);
        }
      });
  });
}
// async download an image (or smtg else)
// that function is quite "sensitive" to the uri
// https://www.npmjs.com/package/node-fetch
function checkStatus(res) {
  if (res.ok) {
    // res.status >= 200 && res.status < 300
    return res;
  }
  throw new Error(`${res.statusText} from ${res.url}`);
}

function download(uri, filename, callback) {
  // Set User-Agent as required by https://meta.wikimedia.org/wiki/User-Agent_policy
  //  <client name>/<version> (<contact information>) <library/framework name>/<version> [<library name>/<version> ...].
  const agent = `${name}/${version} (${homepage}) node-fetch/2.6`;
  const opts = { headers: { 'User-Agent': agent } };
  debug(`Downloading ${uri})`);
  fetch(uri, opts)
    .then(checkStatus)
    .then((res) => {
      const dest = fs.createWriteStream(filename);
      res.body.pipe(dest);
      dest.on('finish', () => debug(`...${uri} downloaded to ${filename}`));
      dest.on('finish', callback);
    })
    .catch(console.err);
}

// See https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
function clean_french(string) {
  // remove accent NFD = Normalization Form Canonical Decomposition.
  const cleaned = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // replace all non word character from the basic Latin alphabet. Equivalent to [^A-Za-z0-9_].
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes
  return cleaned.replace(/\W+/g, '_').toLowerCase();
}

// helpers
function pict_filename(card_obj, suffix = '') {
  return `${img_path + card_obj.id}_${clean_french(
    card_obj.title,
  )}${suffix}${path.extname(card_obj.picture)}`;
}
function card_type(str) {
  return `\\cardtype${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}
function front_filename(card_obj) {
  return `${output_path + card_obj.id}_${clean_french(
    card_obj.title,
  )}_front.tex`;
}
function back_filename(card_obj) {
  return `${output_path + card_obj.id}_${clean_french(
    card_obj.title,
  )}_back.tex`;
}

function download_and_resize_picture(card_obj, resize = false) {
  // download and resize image to fit the size of a card
  // resizer(pict_filename(card_obj, '_web_original'), pict_filename(card_obj));
  const filename = pict_filename(card_obj, '_web_original');
  download(card_obj.picture, filename, () => {
    debug(`...Downloaded (${filename})`);
    if (resize) {
      resizer(filename, pict_filename(card_obj));
    }
  });
}

// main content of .tex files associated to a card. uses macros in ./latex
function front_content(card_obj) {
  debug(`front_content ${card_obj.title}`);
  // eslint-disable-next-line no-param-reassign
  if (!card_obj.credits_color) {
    card_obj.credits_color = 'white';
  }

  return `
  \\begin{tikzpicture}
    \\cardborder
    \\cardfrontbackground{${pict_filename(card_obj)}}
    ${card_type(card_obj.type)}
    \\cardtitle{${card_obj.title}}
    \\cardcredits[${card_obj.credits_color}]{${card_obj.credits}}
  \\end{tikzpicture}`;
}

// main content of .tex files associated to a card. uses macros in ./latex
function back_content(card_obj) {
  debug(`back_content ${card_obj.title}`);
  return `
  \\begin{tikzpicture}
    \\cardborder
    \\cardbackbackground{${pict_filename(card_obj)}}
    ${card_type(card_obj.type)}
    \\cardcontent{${card_obj.year}}{${card_obj.description}}
  \\end{tikzpicture}`;
}

// main pdf with one card per page
function generate_latex_one_card_by_page(cards) {
  debug(`Generating 1 card by page for ${program.args[0]}`);
  const header = `\\documentclass[a4paper]{article}

  \\input{./${latex_path}/packages}
  \\input{./${latex_path}/tikzcards}

  \\geometry{
    paperheight= 88.9mm, %see \\cardheight cm,
    paperwidth = 63.5mm, %see \\cardwidth  cm,
  }

  \\begin{document}%
  `;

  let document = '';

  // the LaTeX document is basically the list of all cards
  for (let i = 0; i < cards.length; i += 1) {
    document += `
    \\clearpage%
    \\input{${front_filename(cards[i])}}%
    \\clearpage%
    \\input{${back_filename(cards[i])}}%
    `;
  }

  // manually deal with the rule card
  document += `
    \\clearpage%
    \\input{${rules_front}}%
    \\clearpage%
    \\input{${rules_back}}%
    `;

  const footer = '\\end{document}';

  fs.writeFileSync(latex_one_card_by_page_name, header + document + footer);
}

// main pdf with nine cards per page
function generate_latex_nine_cards_by_page(cards) {
  debug(`Generating 3x3 plates for ${program.args[0]}`);
  const header = `\\documentclass[a4paper]{article}

  \\input{./${latex_path}/packages}
  \\input{./${latex_path}/tikzcards}

  \\geometry{hmargin=5mm, vmargin=10mm}

  \\begin{document}%
  `;
  // a LaTeX tabular is used to create the 3x3 matrix
  const tabular_start = `  \\begin{center}
    \\begin{tabular}{@{}c@{\\hspace{2mm}}c@{\\hspace{2mm}}c@{}}%
`;
  const tabular_end = `    \\end{tabular}
    \\end{center}%
    \\clearpage%
`;

  const footer = '\\end{document}';
  let document = '';

  // key helper to pad the 3x3 tabular with cards
  function tabular_line_or_rules(idx, front = true) {
    let str = '';
    if (idx < cards.length) {
      // standard card from the content file
      if (front) {
        str = `      \\input{${front_filename(cards[idx])}}`;
      } else {
        str = `      \\input{${back_filename(cards[idx])}}`;
      }
    } else if (idx === cards.length) {
      // extra rule card appended at the end
      if (front) {
        str = `      \\input{${rules_front}}`;
      } else {
        str = `      \\input{${rules_back}}`;
      }
    } else {
      // padding to fill the 3x3 tabular area
      str = `      \\input{${blank_card}}`;
    }

    if (front) {
      if (idx % 3 === 2) {
        str += '\\\\%\r\n';
      } else {
        str += '&%\r\n';
      }
    } else if (idx % 3 === 0) {
      str += '\\\\%\r\n';
    } else {
      str += '&%\r\n';
    }
    return str;
  }

  for (let p = 0; p < (cards.length + 1) / 9; p += 1) {
    // for each printing plate, which is 3x3
    document += tabular_start;
    for (let l = 0; l < 3; l += 1) {
      document += tabular_line_or_rules(9 * p + 3 * l + 0, true);
      document += tabular_line_or_rules(9 * p + 3 * l + 1, true);
      document += tabular_line_or_rules(9 * p + 3 * l + 2, true);
    }
    document += tabular_end;

    document += tabular_start;
    for (let l = 0; l < 3; l += 1) {
      document += tabular_line_or_rules(9 * p + 3 * l + 2, false);
      document += tabular_line_or_rules(9 * p + 3 * l + 1, false);
      document += tabular_line_or_rules(9 * p + 3 * l + 0, false);
    }
    document += tabular_end;
  }

  fs.writeFileSync(latex_nine_cards_by_page_name, header + document + footer);
}

// eslint-disable-next-line no-unused-vars
function timeline(cards) {
  debug(`Launching ${name} v${version}`);
  // MAIN PROGRAM LOOP : card generation
  const options = program.opts();

  for (let i = 0; i < cards.length; i += 1) {
    const card_obj = cards[i];
    if (options.download) {
      download_and_resize_picture(card_obj, options.resize);
    }
    if (!options.download && options.resize) {
      resizer(
        pict_filename(card_obj, '_web_original'),
        pict_filename(card_obj),
      );
    }
    if (options.generate) {
      fs.writeFileSync(front_filename(card_obj), front_content(card_obj));
      fs.writeFileSync(back_filename(card_obj), back_content(card_obj));
    }
  }

  if (options.nineByPage) {
    generate_latex_nine_cards_by_page(cards);
  }

  if (options.oneByPage) {
    generate_latex_one_card_by_page(cards);
  }
}

// COMMAND LINE PROGRAM
program
  .version(version)
  .name(`node ${main}`)
  .description(`${description}\nSee ${homepage} for further help.`)
  .usage('[options] <content_file>')
  .option('-d, --download', 'download the images')
  .option('-r, --resize', 'resize (existing) images')
  .option('-g, --generate', 'generate LaTeX files, one per card')
  .option('-9, --nine-by-page', 'generate main LaTeX file with 9 cards by page')
  .option('-1, --one-by-page', 'generate main LaTeX file with one card by page')
  .parse(process.argv);

if (program.args.length !== 1) {
  program.help();
}

// MAIN GLOBAL VARIABLES AND PROGRAM
// synchronous read and parse
let input_csv = ''; // content of csv file
let input_cards = []; // parsed csv

// create dir if not existent
if (!fs.existsSync(img_path)) {
  fs.mkdirSync(img_path);
}
if (!fs.existsSync(output_path)) {
  fs.mkdirSync(output_path);
}

// format of csv is //id,type,title,year,picture,credits,description,credits_color//
input_csv = fs.readFileSync(program.args[0]);
input_cards = parse(input_csv, { delimiter: ',', columns: true });
debug(`Read ${input_cards.length} cards from ${program.args[0]}`);

if (!fs.existsSync(program.args[0])) {
  console.error(`File ${program.args[0]} does not exist`);
  process.exit(1);
}

// run the main program
timeline(input_cards);
