const express = require('express');
const app = express();
const cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');

const fs = require("fs");
const { parse } = require("csv-parse");

class Contact {
    constructor(lat = "", lng="") {
        this.lat = lat;
        this.lng = lng;
        // this.type = type;
    }
    saveAsCSV() {
        const csv = `new google.maps.LatLng(${this.lat},${this.lng}), \n`;
        try {
            fs.appendFileSync("./contacts.csv", csv);
        } catch (err) {
            console.error(err);
        }
    }
}
const startApp = (lat = "", lng="", type="") => {
    const contact1 = new Contact(lat, lng, type);
    contact1.saveAsCSV();
}



app.use(cors(
    {
        origin: "*",
    }
))

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname, '/public')));
// app.use(express.static(path.join(__dirname, '/public/cep')));


app.get("/",(req, res) =>{
    res.sendFile(__dirname + "/public/index.html")
} )
app.get('/policecalls', (req, res) => {
    let type = req.params.type;
    fs.createReadStream("./policecalls.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
        startApp(row[2],row[3]);
    })
   
    
})


app.listen(3000, () => console.log('Example app is listening on port 3000.'));