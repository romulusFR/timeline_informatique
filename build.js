let fs = require('fs');
let parse = require('csv-parse/lib/sync');
let request = require('request');
let path = require('path');
let im_meta = require('im-metadata');
let {exec} = require('child_process');


// height of images : (card_height - 2*borders) * 300dpi, here for a poker-sized deck (3.5 in)
const golden_height = 980;
// width of images : (card_width - 2*borders) * 300dpi, here for a poker-sized deck (2.5 in)
const golden_width = 680;
const golden_ratio = golden_height/golden_width;
// percentage of "visible" width, ie, tthe width of the card minus the width of the vertical strip and (2) strip paddings
const strip_width_percent = 0.1666;
// ratio of the visible part of the image
const corrected_ratio = golden_height/(golden_width*(1-strip_width_percent));

const content_file = './Computer_history_timeline - Contenus.csv';
const img_path = './deck/';                                           //where to store downloaded images 
const latex_path = './deck/';                                         //where to store generated .tex cards 
const latex_one_card_by_page_name = './one_card_by_page.tex';         //main .tex with paper size set to the card
const latex_nine_cards_by_page_name = './nine_cards_by_page.tex';     //main .tex with paper size set to A4, 3x3 cards by page
const rules_front = latex_path + '0_rules_front.tex';                 //special "rules" card, front, added to the deck
const rules_back  = latex_path + '0_rules_back.tex';                  //special "rules" card, back, added to the deck
const blank_card  = latex_path + '00_blank.tex';                      //special blank card, added to pad A4 paper

//create dir if not existent
if (!fs.existsSync(img_path)){
  fs.mkdirSync(img_path);
}
if (!fs.existsSync(latex_path)){
  fs.mkdirSync(latex_path);
}

// MAIN GLOBAL VARIABLES
// synchronous read and parse
let input = fs.readFileSync(content_file);
//format of csv is //id,type,title,year,picture,credits,description,credits_color//
let cards = parse(input, {delimiter: ',', columns : true});


//system call to resize images using image magick's convert
function convert(input, output, x, y, dx, dy){
  let cmd = `convert ${input} -quality 98 -crop "${x}x${y}+${dx}+${dy}" -resize "${golden_width}x${golden_height}" ${output}`;
  console.log('exec: ' + cmd);
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      return;
    }
    // console.log(`stdout: ${stdout}`);
    // console.log(`stderr: ${stderr}`);
  });
}

//resize images according to their format wrt the ideal one
function resizer(input, output){
  im_meta(input, {}, function(error, metadata) {
    if (error) {
      console.error(error);
    }
    let ratio = metadata.height / metadata.width;
    //if the image is too much vertical
    if (ratio > golden_ratio){
      convert(input, output,  metadata.width, Math.round(metadata.width*golden_ratio), 0, Math.round((metadata.height-metadata.width*golden_ratio)/2) )
    }
    //if the image is too much horizontal. In that case, we have enough space to shift the cropped image on the "visible" part of the image
    else{
      convert(input, output,  Math.round(metadata.height/golden_ratio), metadata.height, Math.round((metadata.width-(1+strip_width_percent)*metadata.height/golden_ratio)/2), 0 )
    }
  });
};

//async download an image (or smtg else)
function download(uri, filename, callback){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

//to have courtesy file names
function clean_french(string){
  let accent = [
    /[\300-\306]/g, /[\340-\346]/g, // A, a
    /[\310-\313]/g, /[\350-\353]/g, // E, e
    /[\314-\317]/g, /[\354-\357]/g, // I, i
    /[\322-\330]/g, /[\362-\370]/g, // O, o
    /[\331-\334]/g, /[\371-\374]/g, // U, u
    /[\321]/g, /[\361]/g, // N, n
    /[\307]/g, /[\347]/g, // C, c
  ];
  let noaccent = ['A','a','E','e','I','i','O','o','U','u','N','n','C','c'];
  for(let i = 0; i < accent.length; i++){
      string = string.replace(accent[i], noaccent[i]);
  }

  string = string.replace(/&/g, "et");
  string = string.replace(/[/\\?,.;:§!{}()\[\]']/g, "");
  string = string.replace(/[ ]+/g, "_");
  string = string.toLowerCase();
  return string;
}


//helpers
function pict_filename(card_obj, suffix = ''){
  return img_path + card_obj.id + '_' + clean_french(card_obj.title) + suffix + path.extname(card_obj.picture);
};
function card_type(str){
  return '\\cardtype' + str.charAt(0).toUpperCase() + str.slice(1);
};
function front_filename(card_obj){
  return latex_path + card_obj.id + '_' + clean_french(card_obj.title) + '_front.tex';
};
function back_filename(card_obj){
  return latex_path + card_obj.id + '_' + clean_french(card_obj.title) + '_back.tex';
};

// main content of .tex files associated to a card. uses macros in ./latex
function front_content(card_obj){
  if (!card_obj.credits_color)
    card_obj.credits_color = 'white';

  return`
  \\begin{tikzpicture}
    \\cardborder
    \\cardbackground{${pict_filename(card_obj)}}
    ${card_type(card_obj.type)}
    \\cardtitle{${card_obj.title}}
    \\cardcredits[${card_obj.credits_color}]{${card_obj.credits}}
  \\end{tikzpicture}`;
}

function back_content(card_obj){
  return`
  \\begin{tikzpicture}
    \\cardborder
    \\cardbackground{${pict_filename(card_obj)}}
    ${card_type(card_obj.type)}
    \\cardtitle{${card_obj.title}}
    \\cardcontent{${card_obj.year}}{${card_obj.description}}
  \\end{tikzpicture}`;
}


function download_and_generate_contents(card_obj){ 
  //download and resize image to fit the size of a card
/*   download(card_obj.picture, pict_filename(card_obj, '_web_original'), () => {
    console.log(pict_filename(card_obj));
    resizer(pict_filename(card_obj, '_web_original'), pict_filename(card_obj));
  }); */
  resizer(pict_filename(card_obj, '_web_original'), pict_filename(card_obj));
  
  fs.writeFileSync(front_filename(card_obj),front_content(card_obj) );
  fs.writeFileSync(back_filename(card_obj),back_content(card_obj) );
}

//generates all .tex files
function generate_all_contents(){
  for(let i = 0; i < cards.length; i++){
    download_and_generate_contents(cards[i]);
  }
}

function generate_latex_one_card_by_page(){
  let header =
  `\\documentclass[a4paper]{article}

  \\input{./latex/packages}
  \\input{./latex/tikzcards}

  \\geometry{
    paperheight= 88.9mm, %see \\cardheight cm,
    paperwidth = 63.5mm, %see \\cardwidth  cm,
  }

  \\begin{document}%
  `;

  let document = '';  

  for(let i = 0; i < cards.length; i++){
    document += `
    \\clearpage%
    \\input{${front_filename(cards[i])}}%
    \\clearpage%
    \\input{${back_filename(cards[i])}}%
    `;
  }

  //manually deal with the rules
  document += `
    \\clearpage%
    \\input{${rules_front}}%
    \\clearpage%
    \\input{${rules_back}}%
    `;

  let footer = 
  `\\end{document}`;

  fs.writeFileSync(latex_one_card_by_page_name, header + document + footer);
}

function generate_latex_nine_cards_by_page(){
  let header =
  `\\documentclass[a4paper]{article}

  \\input{./latex/packages}
  \\input{./latex/tikzcards}

  \\geometry{hmargin=5mm, vmargin=10mm}

  \\begin{document}%
  `

  let tabular_start = 
  `  \\begin{center}
    \\begin{tabular}{@{}c@{\\hspace{2mm}}c@{\\hspace{2mm}}c@{}}%
`;

  let tabular_end = 
  `    \\end{tabular}
    \\end{center}%
    \\clearpage%
`;

  let footer = 
  `\\end{document}`;

  let document = '';

  //key helper to pad the 3x3 tabular with cards
  function tabular_line_or_rules(idx, front=true){
    let str = '';
    if(idx < cards.length){
      //standard card from the content file
      if(front)
        str = `      \\input{${front_filename(cards[idx])}}`;
      else
        str = `      \\input{${back_filename(cards[idx])}}`;
    }
    else if (idx == cards.length){
      //extra rule card appended at the end
      if(front)
        str = `      \\input{${rules_front}}`;
      else
        str = `      \\input{${rules_back}}`;
    }
    else{
      //padding to fill the 3x3 tabular area
      str = `      \\input{${blank_card}}`;
    }

    if(front){
      if((idx)%3 == 2)
        str += '\\\\%\r\n';
      else
        str += '&%\r\n';
    }
    else{
      if((idx)%3 == 0)
        str += '\\\\%\r\n';
      else
        str += '&%\r\n';
    }
    return str;
  }

  for(let p = 0; p < (cards.length+1)/9; p++){
    //for each printing plate, which is 3x3
    document += tabular_start;
    for(let l = 0; l < 3; l++){
      document += tabular_line_or_rules(9*p+3*l+0, true);
      document += tabular_line_or_rules(9*p+3*l+1, true);
      document += tabular_line_or_rules(9*p+3*l+2, true);
    }
    document += tabular_end;

    document += tabular_start;
    for(let l = 0; l < 3; l++){
      document += tabular_line_or_rules(9*p+3*l+2, false);
      document += tabular_line_or_rules(9*p+3*l+1, false);
      document += tabular_line_or_rules(9*p+3*l+0, false);
    }
    document += tabular_end;
  } 


  fs.writeFileSync(latex_nine_cards_by_page_name, header + document + footer);
}

// console.log(cards);

generate_all_contents();
generate_latex_one_card_by_page();
generate_latex_nine_cards_by_page();