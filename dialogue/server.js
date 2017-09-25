const express = require('express')
const graphql = require('graphql') //actual graphql library, with all the associated types needed to define our graphql schema
const graphQLHTTP = require('express-graphql')
const schema = require("./schema/schema")

const app = express()
app.use('/graphql', graphQLHTTP({
    schema,
    graphiql: true
})) //need to configure the express middleware so that any http request (get, post, whatever) to this endpoint will be handled by graphql
app.listen(4000, ()=>console.log("server started and listening"))