const express = require("express");
const { randomUUID } = require('crypto');
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const app = express();
const bcrypt = require('bcrypt');



const PORT = 3000;
const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'spring',
    password: 'admin',
    port: 5432,
});

app.use(bodyParser.json());

app.listen(PORT, ()=>{
    console.log(`Porta ${PORT} Rodando Normalmente`);

    pool.query(
        'CREATE TABLE IF NOT EXISTS shop(id text UNIQUE NOT NULL, nome text not null, price_in_cents int not null, active boolean NOT NULL)',
        (error, result) => {
            if (error){
                console.log(`Erro ao criar tabela: ${error}`);
            } else {
                console.log(`Sucesso ao rodar o código`);
            }
        }
    );
    pool.query(
        'CREATE TABLE IF NOT EXISTS accounts(id text UNIQUE NOT NULL, username text not null, password text not null, active boolean not null)',
        (error, result) => {
            if (error){
                console.log(`Erro ao criar tabela: ${error}`);
            } else {
                console.log(`Sucesso ao rodar o código`);
            }
        }
    )
});

app.get('/product', (req, res) =>{
    pool.query('SELECT * FROM shop WHERE active=true', (error, result) => {
        if (!error){
            res.status(200).json(result.rows);
        }else {
            res.status(500).json({error: 'Erro ao consultar dados'});
        }
    })
});

app.post('/product', (req, res) =>{
    const { nome, price_in_cents } = req.body;
    const id = randomUUID();
    pool.query(
        'INSERT INTO shop (id, nome, price_in_cents, active) VALUES ($1, $2, $3, true)',
        [id, nome, price_in_cents ],
        (error, result) => {
            if(!error) {
                res.status(201).json({message: 'Registro inserido com sucesso'});
            }else {
                res.status(500).json({Error: "Erro ao inserir dados"});
            }
        }
    )
});

app.put('/product/:id', (req, res)=> {
    const { nome, price_in_cents} = req.body;
    const id_user = req.params.id;
    pool.query(
        'UPDATE shop SET nome = $1, price_in_cents = $2 WHERE id = $3',
        [nome, price_in_cents, id_user],
        (error, result) => {
            if(!error){
                res.status(200).json({message: 'Registro atualizado com sucesso'});
            }else{
                res.status(500).json({error: "Erro ao atualizar dados verifique e tente novamente"});
            }
        }
    );

});

app.delete('/product/:id', (req, res) => {
    const id = req.params.id;
    pool.query(
        'UPDATE shop SET active = false WHERE id = $1',
        [id],
        (error, result) => {
            if (!error){
                res.status(200).json({message: "Dados Desativados com sucesso"});
            }else {
                res.status(500).json({error: "Erro ao desativar dados"});
            }
        }
    );
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await pool.query(
            'SELECT * FROM accounts WHERE username = $1',
            [username]
        );

        if (user.rows.length > 0) {
            const hashedPassword = user.rows[0].password;

            console.log('Senha fornecida:', password);
            console.log('Senha armazenada (hash):', hashedPassword);

            // Comparando a senha fornecida com a senha armazenada no banco de dados usando bcrypt
            const match = await bcrypt.compare(password, hashedPassword);

            if (match) {
                res.status(200).json({
                    status: "Logado",
                    msg: {
                        code: 'Success',
                        text: 'Logado com sucesso'
                    }
                });
            } else {
                res.status(401).json({
                    status: "Não Logado",
                    msg: {
                        code: 'Unauthorized',
                        text: 'Credenciais inválidas'
                    }
                });
            }
        } else {
            res.status(401).json({
                status: "Não Logado",
                msg: {
                    code: 'Unauthorized',
                    text: 'Credenciais inválidas'
                }
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "Não Logado",
            msg: {
                code: 'Failed',
                text: 'Não foi possível logar. Tente novamente.'
            }
        });
    }
});

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const id_UUID = randomUUID();
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO accounts (id, username, password, active) VALUES ($1, $2, $3, $4)',
            [id_UUID, username, hashedPassword, true]
        );

        res.status(201).json({
            status: "Registrado",
            msg: {
                code: 'Success',
                text: 'Usuário registrado com sucesso'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "Erro no Registro",
            msg: {
                code: 'Failed',
                text: 'Não foi possível registrar o usuário. Tente novamente.'
            }
        });
    }
});