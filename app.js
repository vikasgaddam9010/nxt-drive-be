const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const cors = require('cors')
const bcrypt = require("bcrypt")
const jwttoken = require('jsonwebtoken')

const app = express()
app.use(cors({origin: '*'}))
app.use(express.json())

let db

const startServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, 'database.db'),
      driver: sqlite3.Database,
    })
    console.log('Database connected successfully.')
  } catch (e) {
    console.log('Failed to connect to the database:', e.message)
    process.exit(1)
  }
}

startServer()

app.post('/register', async (req, res) => {
    try {
      const {firstName, lastName, gender, userName, password} = req.body
      const checkUserNameInDb = await db.get(
        `SELECT * FROM users WHERE user_name = '${userName}';`,
      )
      if (checkUserNameInDb === undefined) {
        const hasedPassword = await bcrypt.hash(password, 10)
        await db.run(
          `INSERT INTO users (first_name, last_name,  user_name, gender, hashed_password) VALUES ('${firstName}', '${lastName}', '${userName}', '${gender}', '${hasedPassword}');`,
        )
        res.status(200).send({message: 'User Added'})
      } else {
        console.log("error")
        res.status(400).send({message: 'Username already Existing.'})
      }
    }catch(e){
        console.log(e.message)
      res.status(400).send({message: e.message})
    }
})

app.post('/login/', async (req, res) => {
  const {username, password} = req.body
  try{
    const dbRes = await db.get(
      `SELECT * FROM users WHERE user_name = '${username}';`,
    )
    console.log(dbRes)
    if (dbRes === undefined) {
      res.status(400).send({message: 'Invalid user'})
    } else {
      const checkPassword = await bcrypt.compare(password, dbRes.hashed_password)
      if (checkPassword) {
        const jwtToken = jwttoken.sign({username}, 'encryptedKey')
        res.status(200).send({message: 'Sucess', jwtToken, userName: dbRes.user_name})
      } else {
        res.status(400).send({message: 'Invalid Password'})
      }
    }
  }catch(e){
    res.status(400).send({message:e.message})
  }
})

const check = (req, res, next) => {
  let jwt
  const header = req.headers['authorization']
  if (header != undefined) {
    jwt = header.split(' ')[1]
  }
  if (jwt === undefined) {
    res.status(401)
    res.send('Invalid JWT Token')
  } else {
    jwttoken.verify(jwt, 'encryptedKey', async (err, payload) => {
      if (err) {
        res.status(401)
        res.send('Invalid JWT Token')
      } else {
        const {username} = payload
        req.username = username
        //console.log('correct jwt token')
        next()
      }
    })
  }
}

app.post("/new-todo-lists", check, async (req, res) => {
  try{
    const {id, username, title, description, due_date, priority} = req.body
    await db.run(`INSERT INTO user_data (id, username, title, description, due_date, priority) VALUES ('${id}', '${username}', '${title}', '${description}', '${due_date}', '${priority}');`);
    res.status(200).send("Success")
  }catch(e){
    res.status(400).send({message: e.message})
  }
})

app.get("/get-todos-list" , check, async (req, res) => {
  try{
    const {username} = req
    const list = await db.all(`SELECT * FROM user_data WHERE username = '${username}';`)
    console.log(list)
    res.status(200).send({list})
  }catch(e){
    res.status(400).send({message: e.message})
  }
})

app.get("/get-todo-by-id/:id", check, async (req, res) => {
  try{
    const {id} = req.params
    const todo = await db.get(`SELECT * FROM user_data WHERE id = '${id}';`)
    res.status(200).send(todo)
  }catch(e){
    res.status(400).send({message: e.message})
  }
})

app.put('/edit-todo-by-id/:id', check, async(req, res) => {
  try{
    const Id = req.params.id   
    const {id, username, title, description, due_date, priority} = req.body.todo
    await db.run(`UPDATE user_data SET id = '${id}', username = '${username}', title='${title}', description = '${description}', due_date = '${due_date}', priority = '${priority}' WHERE id = '${Id}';`);
    console.log("Sucess")
    res.status(200).send({message: "Success"})
  }catch(e){
      res.status(400).send({message: e.message})
  }
})

app.delete("/delete-todo-by-id/:id", check, async(req, res) => {
  const Id = req.params.id
  console.log(Id,"id")
  try{
    await db.run(`DELETE FROM user_data WHERE id = '${Id}';`)
    console.log("success")
    res.status(200).send({message:"success"})
  }catch(e){
    console.log(e.message)
    res.status(400).send({message:e.message})
  }
})

app.listen(3001)