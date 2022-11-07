require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('node:dns');
const mongoose = require('mongoose');

app.use(express.json());

const port = process.env.PORT || 3000;
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number,
});

let Url = mongoose.model('URL', urlSchema);

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.post(
  '/api/shorturl',
  express.urlencoded({ extended: true }),
  (req, res) => {
    let url = req.body.url;
    dns.lookup(url.replace(/^https?:\/\//i, ''), (err, address) => {
      if (err || !url.match(/^https?:\/\//i)) {
        res.json({ error: 'invalid url' });
      } else {
        Url.findOne({ original: url }, (err, data) => {
          if (err) {
            res.json({ error: 'invalid url' });
          } else if (data) {
            res.json({ original_url: data.original, short_url: data.short });
          } else {
            Url.countDocuments({}, (err, count) => {
              if (err) {
                res.json({ error: 'error' });
              } else {
                let newUrl = new Url({
                  original: url,
                  short: count + 1,
                });
                newUrl.save((err, data) => {
                  if (err) {
                    res.json({ error: 'Internal error' });
                  } else {
                    res.json({
                      original_url: data.original,
                      short_url: data.short,
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }
);

app.get('/api/shorturl/:short', (req, res) => {
  Url.findOne({ short: req.params.short }, (err, data) => {
    if (err) {
      res.json({ error: 'invalid url' });
    } else {
      res.redirect(data.original);
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
