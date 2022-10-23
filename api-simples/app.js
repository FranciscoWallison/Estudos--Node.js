const express = require('express');
const app = express();
const cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');


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

app.get('/teste', (req, res) => {
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
   let numero1 = req.body.numero1
   let numero2 = req.body.numero2
    let forma = Number(numero1) + Number(numero2);
    let soma = {
        soma: forma
    }
    res.json(soma)
})


app.listen(3000, () => console.log('Example app is listening on port 3000.'));