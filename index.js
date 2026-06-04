const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

app.use(express.json());
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const uri = process.env.MONGO_URI;
const PORT = process.env.PORT;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.FRONTEND_URL}/api/auth/jwks`)
    //   http://localhost:3000/api/auth/jwks
)

const verifyToken = async (req, res, next) => {

    const authHeader = req?.headers?.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'unauthorized' })
    }
    const token = authHeader.split(" ")[1]
    if (!token) {
        return res.status(401).json({ message: 'unauthorized' })
    }
    // console.log(token);

    try {
        const { payload } = await jwtVerify(token, JWKS)
        // console.log(payload);
        next()
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" })
    }

}
async function run() {
    try {

        const db = client.db("mediqueue-db");
        const tutorCollection = db.collection("tutors");
        // const myTutorsCollection = db.collection("my-tutors");
        const myBookingCollection = db.collection("my-bookings");

        // GET featured tutors data (HOME PAGE)
        app.get('/feat-tutors', async (req, res) => {
            const result = await tutorCollection.find().limit(6).toArray();
            res.send(result);
        });

        // GET all tutors data (TUTORS PAGE) with optional name search
        app.get('/all-tutors', async (req, res) => {
            // const searchTerm = req.query.search;
            const { search, startDate, endDate } = req.query;
            console.log(search, startDate, endDate);
            // let result;
            let query = {};
            if (search) {
                query.name = {
                    $regex: search,
                    $options: 'i'
                };
            }

            if (startDate && startDate.trim() !== "") {
                // Tutors who starton or after this date
                query.sessionStartDate = { ...query.sessionStartDate, $gte: new Date(startDate) };
            }

            if (endDate && endDate.trim() !== "") {
                // Tutors who start on or before this date
                query.sessionStartDate = { ...query.sessionStartDate, $lte: new Date(endDate) };
            }
            // console.log("MongoDB Query:", JSON.stringify(query));
            console.log("Full Query Object being sent to MongoDB:", JSON.stringify(query, null, 2));
            const result = await tutorCollection.find(query).toArray();
            res.send(result);

            // const query = searchTerm
            //     ? {
            //         name: { $regex: searchTerm, $options: 'i' }
            //     }
            //     : {};

            // result = await tutorCollection.find().toArray();
            // res.send(result);
        });

        // GET single tutor data by id (TUTOR DETAILS PAGE)
        app.get('/all-tutors/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await tutorCollection.findOne(query);
            res.send(result);
        });


        // get tutors added by a user
        app.get('/my-tutors/:userId', verifyToken, async (req, res) => {
            const userId = req.params.userId;
            const result = await tutorCollection.find({ userID: userId }).toArray();
            res.send(result);
        });

        // get tutors booked by me
        app.get('/my-bookings/:userId', verifyToken, async (req, res) => {
            const userId = req.params.userId;
            const result = await myBookingCollection.find({ userId: userId }).toArray();
            res.send(result);
        });

        // for booking a tutor session by user
        app.patch('/all-tutors/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            // console.log(req.body);
            const tutor = await tutorCollection.findOne({ _id: new ObjectId(id) });
            console.log(tutor);

            if (!tutor) {
                return res.status(404).send({ message: 'Tutor not found' });
            }

            const date1 = new Date(tutor.sessionStartDate);
            const date2 = new Date();

            if (date2 < date1) {
                return res.status(400).send({
                    message: 'Booking is not available yet for this tutor',
                    errorCode: 'BOOKING_NOT_AVAILABLE_YET'
                });
            }

            if (tutor.remainingSlots <= 0) {
                return res.status(400).send({
                    message: 'This session is fully booked. You can not join at this moment.',
                    errorCode: 'NO_SLOTS_AVAILABLE'
                });
            }

            await tutorCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { remainingSlots: -1 } }
            );

            const result = await myBookingCollection.insertOne(update);

            res.send(result);
        });

        // for updating added tutor data by user
        app.patch('/my-tutors/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            console.log(updatedData);

            const result = await tutorCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData });

            res.send(result);
        });

        // for adding a tutor by user
        app.post('/all-tutors', verifyToken, async (req, res) => {
            const tutorData = req.body;
            tutorData.sessionStartDate = new Date(tutorData.sessionStartDate);
            console.log(tutorData);
            tutorData.remainingSlots = parseInt(tutorData.remainingSlots, 10);
            const result = await tutorCollection.insertOne(tutorData);
            res.json(result);
        })

        // for deleting a tutor added by user
        app.delete('/my-tutors/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await tutorCollection.deleteOne(filter);
            res.json(result);
        });

        // for updating the status of booking session by user
        app.patch('/my-bookings/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const update = { $set: { status: "Cancelled" } };
            // toggle status between "Booked" and "Cancelled" will be implemented in future update
            // $set: {
            //     status: { $not: "$status" }
            // }
            const result = await myBookingCollection.updateOne(filter, update);
            res.send(result);
        });

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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