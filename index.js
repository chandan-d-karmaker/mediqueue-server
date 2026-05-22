const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

app.use(express.json());
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGO_URI;
const PORT = process.env.PORT;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {

        const db = client.db("mediqueue-db");
        const tutorCollection = db.collection("tutors");
        const myTutorsCollection = db.collection("myTutors");


        app.get('/tutors', async (req, res) => {
            const result = await tutorCollection.find().toArray();
            res.send(result);
        });


            // Connect the client to the server	(optional starting in v4.7)
            await client.connect();
            // Send a ping to confirm a successful connection
            await client.db("admin").command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
        } finally {
            // Ensures that the client will close when you finish/error
            // await client.close();
        }
    }
run().catch(console.dir);

    app.get('/', (req, res) => {

        res.send('Hello from server');
        console.log('server is running, try a endpoint!')

    });

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));