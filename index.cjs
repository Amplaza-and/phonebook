const express = require('express')
const morgan = require('morgan')
const app = express()
app.use(express.json())
const cors = require('cors')
app.use(cors())
app.use(express.static('dist'))
const Person = require('./models/person')

morgan('tiny')
app.use(morgan((tokens, req, res) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    JSON.stringify(req.body)
  ].join(' ')
}))

app.get('/info', (request, response) => {
  const now = new Date()
  Person.find({}).then(persons => {
    const length = persons.length
    response.send("<p>Phonebook has info for "+length+" people</p><p>"+now+"</p>")
  })
})
app.get('/api/persons', (request, response) => {
    Person.find({}).then(persons => {
    response.json(persons)
  })
})

app.get('/api/persons/:id', (request, response, next) => {
    Person.findById(request.params.id).then(person=> {
      if (person) {
        response.json(person)  
      } 
      else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
  })

  
  app.post('/api/persons', (request, response,next) => {
    const body = request.body
    if (!body.name|| !body.number ) {
      return response.status(400).json({ 
        error: 'Name or number are missing' 
      })
    }
    const person = new Person({
      name: body.name,
      number: body.number,
    })
    // If a person with the same name already exists. We choose to update the number.
    Person.findById(request.params.id)
      .then((foundPerson) => {
        if (foundPerson) {
          // Name exists, updating...
          const opts = {
            runValidators: true,
            new: true,
            context: 'query',
          }
          Person.findByIdAndUpdate(request.params.id, foundPerson, opts)
            .then((updatedPerson) => {
              response.json(updatedPerson)
            })
            .catch((error) => next(error))
        } else {
          // Name is new, creating...
          person
            .save()
            .then((savedPerson) => {
              return savedPerson.toJSON()
            })
            .then((savedAndFormattedPerson) => {
              response.json(savedAndFormattedPerson)
            })
            .catch((error) => next(error))
        }
      })
      .catch((error) => next(error))

    morgan.token('body', function (request) { return request.body })
    app.use(morgan(':body'))
    person.save().then(savedPerson=>{
      response.json(savedPerson)
    })
    .catch(error => next(error))
  })

app.delete('/api/persons/:id', (request, response,next) => {
  Person.findByIdAndDelete(request.params.id)
    .then(result=> {response.status(204).end()
  })
  .catch(error=> next(error))
})

app.put('/api/persons/:id', (request, response, next) => {
  const body = request.body

  const person = {
    name: body.name,
    number: body.number
  }
  const opts = {
    runValidators: true,
    new: true,
    context: 'query',
  }
  Person.findByIdAndUpdate(request.params.id, person, opts)
    .then(updatedPerson => {
      response.json(updatedPerson)
    })
    .catch(error => next(error))
})

const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'unknown endpoint' })
}
    
// controlador de solicitudes con endpoint desconocido
app.use(unknownEndpoint)

// Middleware: Error handler
const errorHandler = (error, request, response, next) => {
  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).send({ json: error.message })
  }

  next(error)
}
app.use(errorHandler)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})