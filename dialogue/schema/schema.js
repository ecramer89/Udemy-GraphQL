const {
    GraphQLString,
    GraphQLObjectType,
    GraphQLList,
    GraphQLSchema,
    GraphQLNonNull,
    GraphQLID
} = require('graphql')

const uuid = require('uuid')

const characterId = uuid();
const responseIdA = uuid();
const responseIdB = uuid();


const sampleCharacters = [{
    id: characterId,
    name: "kaz",
    responseId: responseIdA, //id of the current response
    responses: [responseIdA, responseIdB]

}]

const sampleResponses = [
    {
       id: responseIdA,
       text: "what do you like?",
       edgeIds: []
    },

    {
        id: responseIdB,
        text: "good to hear?",
        edgeIds: []

    }

]

const sampleEdges = []

const CharacterType = new GraphQLObjectType({
    name: "Character",
    fields: ()=>({
        id: {type: GraphQLID},
        name: {type: GraphQLString},
        currentText: {
            type: ResponseType,
            resolve(character){
                //we will be hosting the data eventually on an external server but for now we will write out the lists ourselves as sample data
                return sampleResponses.find(response=>response.id === character.responseId)
            }}
    })
})

const EdgeType = new GraphQLObjectType({
    name: "Edge",
    fields: () => ({
        id: {type: GraphQLID},
        from: {
            type: ResponseType,
            resolve(edge){
                return sampleResponses.find(response => response.id === edge.fromResponseId)
            }
        },
        playerInput: {type: GraphQLString},
        to: {
            type: ResponseType,
            resolve(edge) {
                return sampleResponses.find(response => response.id === edge.toResponseId)
            }
        }
    })
})



const ResponseType = new GraphQLObjectType({
    name: "Response",
    fields: ()=>({
        id: {type: GraphQLID},
       text: {type: GraphQLString},
        edges: {
           type: new GraphQLList(EdgeType),
            resolve(response){
               return response.edgeIds.map(edgeId=>sampleEdges.find(edge=>edge.id === edgeId))
            }
       },

    })
})

const mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        advanceDialogue: {
            type: CharacterType,
            args: {
                    characterId: new GraphQLNonNull(GraphQLID),
                    playerInput: GraphQLString
                },
                resolve(parentValue, args){
                    const currentCharacter = sampleCharacters.find(character => character.id === args.characterId)
                    const currentCharacterResponse = sampleResponses.find(response => response.id === currentCharacter.responseId)
                    const edge = currentCharacterResponse.edges.find(edge => edge.playerInput === args.playerInput) //or matches, whatever
                    if(edge){
                        const nextCharacterResponseId = edge.toResponseId;
                        //patch once we swap on json server for now just update
                        currentCharacter.responseId = nextCharacterResponseId;
                    }
                }
        },
        //addCharacterResponse
        //setCharacterInitialResponse
        //addEdgeToResponse
    }
})


const query = new GraphQLObjectType({
    name: "query",
    fields: {
        character: {
            type: CharacterType,
            args: {id: {type: GraphQLString}},
                resolve(parentValue, args) {
                    return sampleCharacters.find(character => character.id === args.id)
                }
            },
        characters: {
            type: new GraphQLList(CharacterType),
            resolve(parentValue){
                return sampleCharacters
            }
        }
    }
})


module.exports = new GraphQLSchema({query})

