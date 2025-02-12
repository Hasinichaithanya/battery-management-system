const express = require("express")
const sqlite3 = require("sqlite3")
const logger =  require("./logger")
const jwt = require('jsonwebtoken');
 const bcrypt = require('bcrypt')
const app = express();
 const verifyToken = require("./middleware")
require('dotenv').config()
const port = process.env.PORT
app.use(express.json());
const db = new sqlite3.Database("battery.db" , (err) => {
    if(err)
    {
        console.log("Error Occurred - " + err.message);
        logger.error('Error while connecting to database');
    }
    else
    {
        console.log("DataBase Connected");
        logger.info('Database Connected');
    }

})


app.post('/api/register', async (req, res) => {
    logger.info(`Register request is made from ${username}`);
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (username,password) values (?,?) ", [username, hashedPassword], (err,rows) => {
            if (err){
                logger.error("Error occurred while creating an user");
                return res.json({
                    status: 401,
                    err
                })

            }
            logger.info(`Registered ${username}`);

            res.json({
                status: 200,
                message: "Registered successfully"
            })
        });
    } catch (error) {
        logger.error("Error occurred while creating an user,Registration failed");
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    logger.info(`Login request is made from ${username}`);
    try {
        const { username, password } = req.body;
        let user;
        const getUser = `SELECT * FROM users WHERE username = ?`;
       await db.get(getUser,[username],async (err,rows) => {
            if (err){
                logger.error(`Error occurred while logging in ${username}`);
                return res.json({
                    status: 401,
                    err
                })
            }
            user = rows;
           if (!user) {
               logger.error(`Login request is failed for ${username}, auth failed`);
               return res.status(401).json({ error: 'Authentication failed' });
           }
           const passwordMatch = await bcrypt.compare(password, user.password);
           if (!passwordMatch) {
               logger.error(`Passwords do not match, for the username: ${username}`);
               return res.status(401).json({ error: 'Authentication failed' });
           }
           const token = jwt.sign({ username }, 'jwt-secret-key', {
               expiresIn: '1h',
           });
           logger.info(`Login success for ${username}`);
            res.status(200).json({ token });
        })

    } catch (error) {
        logger.error(`Login request is failed for ${username}`);
        res.status(500).json({ error: `${error}: Login failed` });
    }
});

app.get('/api/battery',verifyToken, (req, res) => {
    const getBattery = `SELECT * FROM battery;`;
    db.all(getBattery, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/battery/:id',verifyToken,async (req, res) => {
    const { id } = req.params;
    logger.info(`Get battery with ${id} is pinged from user: ${req.username}`) ;
    const getBattery = `
    SELECT
      *
    FROM
      battery
    WHERE
        battery_id = ?;`;
    await db.get(getBattery,[id], (err, rows) => {
        if (err) {
            logger.error(`Error: ${err} in /api/battery/:${id} from user: ${req.username}`)
            return res.status(500).json({ error: err.message });
        }
        if (rows == undefined) {
            logger.error(`Error: Invalid Id at /api/battery/:${id} from user: ${req.username}`)
            res.status(404).json({error:"No battery found"});
            return;
        }
        logger.info(`Request is successful at /api/battery/:${id} from user: ${req.username}`)
        res.json({
            status: "200",data: rows
        });
    });
});

app.post('/api/battery/data', verifyToken,async (req, res) => {
    const {battery_id,voltage,current,temperature,time} = req.body
    logger.info(`Post battery with is pinged with ${battery_id} from user: ${req.username}`) ;

    if (battery_id == null || voltage == null || current == null  || temperature ==null || time == null) {
        logger.error(`Incomplete feilds are provided from user: ${req.username}`)
        res.status(400).json({error: "All the fields are required"});
        return
    }
    const addBattery = `
    INSERT INTO 
     battery (battery_id,voltage,current,temperature,time) values ( ?,?,?,?,?)
    `
   db.run(addBattery,[battery_id,voltage,current,temperature,time],(err,rows)=>{
     if (err) {logger.error(`Error ${err} in /api/battery/data`); return res.status(500).json({ error: err.message }); }
       logger.info(`Post battery with ${battery_id} is successful for user: ${req.username}`) ;
       res.json({status: "200", message: "Battery added successfully"});
 });
})

app.get("/api/battery/:id/:field",verifyToken,  (req, res) => {
    const { id ,field} = req.params;
    const {start,end} = req.query
    console.log(id,field)
    logger.info(`Req is made for /api/battery/:id/:field from user: ${req.username}`)
    const validFields = ['voltage', 'current', 'temperature', 'time'];
    if (!validFields.includes(field)) {
        logger.error(`Invalid fields sent for api/battery/:id/:field from ${req.username}`);
        return res.status(400).json({ error: "Invalid field requested" });
    }
    const  getBattery = `SELECT * FROM battery WHERE battery_id = ?;`;
    const params = [id];

    if (start && end) {
        query += " AND time BETWEEN ? AND ?";
        params.push(start, end);
    }
    db.get(getBattery,params,(err, rows) => {
        if (err)
        {
            logger.error(`Error ${err} in /api/battery/:${id}/:${field} from username: ${req.username}`)
            return res.status(500).json({ error: err.message });
        }
        console.log(rows);
        if (rows == undefined) {
            logger.error(`Error: Invalid Id or field at /api/battery/:${id} from username: ${req.username}`)
            res.status(404).json({error:"No battery found"});
            return;
        }
        logger.info(`Request successful at /api/battery/:${id}/:${field} from username:${req.username}`)
        res.json({status: "200", data : rows[field]});
    })
})


app.listen(4000 , () => {
    console.log("Server started at ", port);
})
