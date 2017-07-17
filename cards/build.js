let fs = require('fs');
let parse = require('csv-parse/lib/sync');
let request = require('request');
let path = require('path');

let im_meta = require('im-metadata');
let {exec} = require('child_process');

const golden_height = 980;
const golden_width = 680;
const golden_ratio = golden_height/golden_width;

const img_path = './deck/';
const latex_path = './deck/';
const latex_one_card_by_page_name = './one_card_by_page.tex';
const latex_nine_cards_by_page_name = './nine_cards_by_page.tex';

if (!fs.existsSync(img_path)){
  fs.mkdirSync(img_path);
}

if (!fs.existsSync(latex_path)){
  fs.mkdirSync(latex_path);
}

//sys call to imagemagick
function convert(input, output, y, x, dy, dx){
  exec(`convert ${input} -quality 100 -crop "${y}x${x}+${dy}+${dx}" -resize "${golden_height}x${golden_width}" ${output}`, (err, stdout, stderr) => {
    if (err) {
      return;
    }
    // console.log(`stdout: ${stdout}`);
    // console.log(`stderr: ${stderr}`);
  });
}

// synchronous read and parse
let input = fs.readFileSync('./contents.csv');
let cards = parse(input, {delimiter: ',', columns : true});


function download(uri, filename, callback){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function resizer(input, output){
  im_meta(input, {}, function(error, metadata) {
    if (error) { console.error(error); }
    let ratio = metadata.height / metadata.width;
    if (ratio > golden_ratio){
      convert(input, output,  metadata.width, Math.round(metadata.width*golden_ratio), 0, Math.round((metadata.height-metadata.width*golden_ratio)/2) )
    }
    else{
      convert(input, output,  Math.round(metadata.height/golden_ratio), metadata.height, Math.round((metadata.width-metadata.height/golden_ratio)/2), 0 )
    }
  });
};


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
  //On met tout en minuscule
  //On remplace tous les espaces par des "_"
  string = string.replace(/[/\\?,.;:§!{}()\[\]']/g, "");
  string = string.replace(/[ ]+/g, "_");
  string = string.toLowerCase();
  return string;
}

function pict_filename(card_obj, suffix = ''){
  return img_path + card_obj.id + '_' + clean_french(card_obj.title) + suffix + path.extname(card_obj.picture);
};

function card_type(str){
  return '\\cardtype' + str.charAt(0).toUpperCase() + str.slice(1);
}

function front_filename(card_obj){
  return latex_path + card_obj.id + '_' + clean_french(card_obj.title) + '_front.tex';
};
function front_content(card_obj){
  return`
  \\begin{tikzpicture}
    \\cardborder
    \\cardbackground{${pict_filename(card_obj)}}
    ${card_type(card_obj.type)}
    \\cardtitle{${card_obj.title}}
    \\cardcredits{${card_obj.credits}}
  \\end{tikzpicture}`;
}

function back_filename(card_obj){
  return latex_path + card_obj.id + '_' + clean_french(card_obj.title) + '_back.tex';
};
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

//id,type,title,year,picture,credits,description

function download_and_generate_contents(card_obj){
  download(card_obj.picture, pict_filename(card_obj, '_web_original'), () => {console.log(pict_filename(card_obj)); resizer(pict_filename(card_obj, '_web_original'), pict_filename(card_obj));});
  //resize image to fit the size of a card
  
  fs.writeFileSync(front_filename(card_obj),front_content(card_obj) );
  fs.writeFileSync(back_filename(card_obj),back_content(card_obj) );
}

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

  let footer = 
  `\\end{document}`;

  fs.writeFileSync(latex_one_card_by_page_name, header + document + footer);
}

function generate_latex_nine_cards_by_page(){
  let header =
  `\\documentclass[a4paper]{article}

  \\input{./packages}
  \\input{./tikzcards}

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
  for(let p = 0; p < cards.length/9; p++){
    //for each printing plate, which is 3x3
    document += tabular_start;
    for(let l = 0; l < 3; l++){
      //for each line
      document += (9*p+3*l+0 < cards.length)?`      \\input{${front_filename(cards[9*p+3*l+0])}} &%\r\n`:`&%\r\n`;
      document += (9*p+3*l+1 < cards.length)?`      \\input{${front_filename(cards[9*p+3*l+1])}} &%\r\n`:`&%\r\n`;
      document += (9*p+3*l+2 < cards.length)?`      \\input{${front_filename(cards[9*p+3*l+2])}}\\\\%\r\n`:`\\\\%\r\n`;
    }
    document += tabular_end;

    document += tabular_start;
    for(let l = 0; l < 3; l++){
      //for each line
      document += (9*p+3*l+2 < cards.length)?`      \\input{${back_filename(cards[9*p+3*l+2])}} &%\r\n`:`&%\r\n`;
      document += (9*p+3*l+1 < cards.length)?`      \\input{${back_filename(cards[9*p+3*l+1])}} &%\r\n`:`&%\r\n`;
      document += (9*p+3*l+0 < cards.length)?`      \\input{${back_filename(cards[9*p+3*l+0])}}\\\\%\r\n`:`\\\\%\r\n`;
    }
    document += tabular_end;
  } 


  fs.writeFileSync(latex_nine_cards_by_page_name, header + document + footer);
}

// console.log(cards);

generate_all_contents();
generate_latex_one_card_by_page();
generate_latex_nine_cards_by_page();