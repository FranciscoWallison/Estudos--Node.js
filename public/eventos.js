const INPUT_NUMERO1 = document.getElementById('numero1');
const INPUT_NUMERO2 = document.getElementById('numero2');

INPUT_NUMERO2.addEventListener('blur', () => {

    fetch('http://localhost:3000/somar', {
        method: 'POST',
        headers: {
            // 'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(
            {   
                "numero1": INPUT_NUMERO1.value,
                "numero2": INPUT_NUMERO2.value
            })
    })
    .then(resposta => resposta.json())
    .then(json => {
        console.log(JSON.stringify(json))
        document.getElementById('soma').innerHTML = json.soma
    })

})

// const INPUT_CEP = document.getElementById('cep');
// const INPUT_LOGRADOURO = document.getElementById('logradouro');
// const INPUT_NUMERO = document.getElementById('numero');
// const INPUT_BAIRRO = document.getElementById('bairro');
// const INPUT_CIDADE = document.getElementById('cidade');
// const INPUT_UF = document.getElementById('uf');

// INPUT_CEP.addEventListener('blur', () => {
//     let cep = INPUT_CEP.value;

//     if(cep.length !== 8 ) {
//         return;
//     }
   
//     fetch(`https://viacep.com.br/ws/${cep}/json/`)
//         .then(resposta => resposta.json())
//         .then(json => {
//             INPUT_LOGRADOURO.value = json.logradouro
//             INPUT_BAIRRO.value = json.bairro
//             INPUT_CIDADE.value = json.localidade
//             INPUT_UF.value = json.uf

//             INPUT_NUMERO.focus();
//         })
// })