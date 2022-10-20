const express = require('express');
const app = express();
const cors = require('cors')
var path = require('path');

app.use(cors(
    {
        origin: "*",
    }
))

app.use(express.static(path.join(__dirname, '/public')));


app.get("/teste",(req, res) =>{
    res.sendFile(__dirname + "/public/cep/index.html")
} )

app.get('/', (req, res) => {
  res.send('Olá mundo!');
});

app.get('/cep/:cep', (req, res) => {

    let cep = req.params.cep;
    // EXEMPLO DE CONSULTA PARA UMA BASE DE DADOS
    var consult_ceps = [
        {
            "cep": "60055400",
            "logradouro": "Avenida Aguanambi",
            "complemento": "até 669 - lado ímpar",
            "bairro": "José Bonifácio",
            "localidade": "Fortaleza",
            "uf": "CE",
            "ibge": "2304400",
            "gia": "",
            "ddd": "85",
            "siafi": "1389"
        },
        {
            "cep": "60811341",
            "logradouro": "Avenida Washington Soares",
            "complemento": "até 3737 - lado ímpar",
            "bairro": "Edson Queiroz",
            "localidade": "Fortaleza",
            "uf": "CE",
            "ibge": "2304400",
            "gia": "",
            "ddd": "85",
            "siafi": "1389"
        }
    ]

    let dataArray = consult_ceps.find(x => x.cep === cep);
    if (typeof dataArray === 'undefined') {
        res.json({});
    }
  
    res.json(dataArray);
});


app.post('/somar',function(req,res){

    // Can access all parameters from req.body
    console.log('POST parameter recieved are: ',req.body)

    res.json('teste')
})




app.listen(3000, () => console.log('Example app is listening on port 3000.'));