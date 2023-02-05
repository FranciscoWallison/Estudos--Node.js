const express = require('express');
const app = express();
const cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');

const excelToJson = require('convert-excel-to-json');
 
const result = excelToJson({
    sourceFile: 'Saude/saudetab_14.xls'
});

app.use(cors(
    {
        origin: "*",
    }
))

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

console.log('result', result)

// app.use(express.static(path.join(__dirname, '/public')));
// // app.use(express.static(path.join(__dirname, '/public/cep')));


// app.get("/",(req, res) =>{
//     res.sendFile(__dirname + "/public/index.html")
// } )