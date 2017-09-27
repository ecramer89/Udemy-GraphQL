const express = require('express');
const ExpressGraphQL = require('express-graphql')
const schema = require('./schema/schema')

const app = express();
app.use('/graphql', new ExpressGraphQL({
    graphiql: true,
    schema
}))

app.listen(4000, ()=>{
    console.log("Listening")

})