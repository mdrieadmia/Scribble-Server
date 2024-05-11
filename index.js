const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;



// Middleware
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cricab9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized Access" })
    }
    if (token) {
        jwt.verify(token, process.env.Access_Token, (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: "Unauthorized Access" })
            }
            else {
                req.user = decoded;
                next()
            }
        })
    }
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // MongoDB Collections
        const blogsCollection = client.db('ScribbleDB').collection('Blogs');
        const commentsCollection = client.db('ScribbleDB').collection('Comments');
        const wishlistCollection = client.db('ScribbleDB').collection('Wishlist');

        // ----------------Auth Related API-----------------------
        // Create token and save to client side cookie.
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.Access_Token, { expiresIn: '1d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
                .send({ success: true })
        })

        // Remove token from cookie after logout an user
        app.get('/logout', (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    maxAge: 0,
                })
                .send({ success: true })
        })

        // ---------------Services Related API---------------------
        app.get('/', async (req, res) => {
            res.send('Scribble Server Is Running...')
        })

        // Post a new blog 
        app.post('/post', async (req, res) => {
            const blog = req.body;
            const result = blogsCollection.insertOne(blog);
            res.send(result)
        })
        
        // Get all posted blogs data from DB
        app.get('/blogs', async (req, res) => {
            const blogs = blogsCollection.find();
            const result = await blogs.toArray();
            res.send(result)
        })

        // Get blog details data from DB
        app.get('/blog/details', async (req, res) => {
            const id = req.query.id
            const query = {_id : new ObjectId(id)}
            const result = await blogsCollection.findOne(query)
            res.send(result)
        })

        // Update blog data in DB
        app.put('/blog/update', async (req, res) => {
            const id = req.query.id
            const query = {_id : new ObjectId(id)}
            const options = { upsert: true };
            const updateBlog = req.body;
            const blog = {
                $set : {...updateBlog}
            }
            const result = await blogsCollection.updateOne(query, blog, options)
            res.send(result)
        })
        
        // Save comment in DB
        app.post('/comments', async (req, res) => {
            const comment = req.body;
            const result = commentsCollection.insertOne(comment);
            res.send(result)
        })

        // Get all comments data from DB
        app.get('/comments', async (req, res) => {
            const id = req.query.id;
            const query = {blogId : id}
            const commnets = commentsCollection.find(query);
            const result = await commnets.toArray();
            res.send(result)
        })

        // Blog added in wishlist
        app.post('/wishlist', async (req, res) => {
            const item = req.body;
            const result = wishlistCollection.insertOne(item);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log("Scribble server is running on port : ", port);
})