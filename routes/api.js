/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const mongoose = require('mongoose');
const expect = require('chai').expect;
const bcrypt = require('bcrypt-nodejs');
const uuidv4 = require('uuid/v4');
const axios = require('axios');
require('dotenv').config();

mongoose.connect(process.env.DB, {useNewUrlParser: true});
const db = mongoose.connection;
module.exports = app => {
  const threadSchema = new mongoose.Schema({
    board: String,
    text: String,
    created_on: Date,
    bumped_on: Date,
    reported: Boolean,
    delete_password: String,
    replies: {
      type: [{
        _id: String,
        text: String,
        created_on: Date,
        delete_password: String,
        reported: Boolean,
      }],
      default: [],
    },
  });

  const Thread = mongoose.model('Thread', threadSchema);
  app.route('/api/threads/:board')
    .post((req, res) => {
      bcrypt.hash((req.body.delete_password || '').trim(), null, null, async (err, hash) => {
        if (err) {
          return console.log(err);
        }

        const timestamp = Date.now();
        const thread = new Thread({
          board: req.params.board,
          text: req.body.text,
          created_on: timestamp,
          bumped_on: timestamp,
          reported: false,
          delete_password: hash,            
        });

        try {
          await thread.save();
          res.redirect(`/b/${req.params.board}/`);
        } catch (err) {
          if (err) {
            console.log(err);
          }
        }
      });
    })
    .get(async (req, res) => {
      try {
        const threads = await Thread.find({ board: req.params.board }, null, {
          sort: {
            bumped_on: -1,
          },
          limit: 10,
        });

        const response = threads.map(thread => ({
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: thread.replies.sort((a, b) => b.created_on - a.created_on)
            .slice(0, 3)
              .map(reply => ({
                _id: reply._id,
                text: reply.text,
                created_on: reply.created_on,
              })).reverse(),
          repliesCount: thread.replies.length,
        }));

        res.json(response);
      } catch (err) {
        console.log(err);
      }
    })
    .delete(async (req, res) => {
      const thread_id = req.body.thread_id;
      try {
        const thread = await Thread.findById(thread_id);
        const hash = thread.delete_password;
        bcrypt.compare(req.body.delete_password, hash, async (err, correct) => {
          if (err) {
            return console.log(err);
          }

          if (!correct) {
            return res.send('incorrect password');
          }

          try {
            await Thread.findByIdAndDelete(thread_id);
            res.send('success');
          } catch (err) {
            console.log(err);
          }
        });
      } catch (err) {
        console.log(err);
      }
    })
    .put(async (req, res) => {
      const threadId = req.body.thread_id;
      try {
        const thread = await Thread.findByIdAndUpdate(threadId, {
          reported: true,
        }, {
          new: true,
        });

        try {
          const response = await axios.post(process.env.WEBTASK_TWILIO, {
            type: 'thread',
            threadId,
            text: thread.text,
          });

          if (response.status === 200) {
            return res.send('success');
          }

          res.send('error messaging administrator');
        } catch (err) {
          console.log(err);
        }
      } catch (err) {
        console.log(err);
      }
    });

  app.route('/api/replies/:board')
    .post((req, res) => {
      bcrypt.hash((req.body.delete_password || '').trim(), null, null, async (err, hash) => {
        if (err) {
          return console.log(err);
        }

        const timestamp = Date.now();
        try {
          await Thread.findByIdAndUpdate(req.body.thread_id, {
            bumped_on: timestamp,
            $push: {
              replies: {
                _id: uuidv4(),
                text: req.body.text,
                created_on: timestamp,
                delete_password: hash,
                reported: false,
              },
            },
          });

          res.redirect(`/b/${req.params.board}/${req.body.thread_id}/`);
        } catch (err) {
          console.log(err);
        }
      });
    })
    .get(async (req, res) => {
      try {
        const {
          _id,
          text,
          created_on,
          bumped_on,
          replies,
        } = await Thread.findById(req.query.thread_id);

        const response = {
          _id,
          text,
          created_on,
          bumped_on,
          replies: replies.map(reply => ({
            _id: reply._id,
            text: reply.text,
            created_on: reply.created_on,
          })),
        };

        res.json(response);
      } catch (err) {
        console.log(err);
      }
    })
    .delete(async (req, res) => {
      try {
        const threadId = req.body.thread_id;
        const thread = await Thread.findById(threadId);
        const replies = thread.replies;
        let replyIndex = -1;
        const reply = replies.find((reply, i) => {
          if (reply._id === req.body.reply_id) {
            replyIndex = i;
            return true;
          }

          return false;
        });

        if (typeof reply === 'undefined') {
          return res.send('reply not found');
        }

        bcrypt.compare(req.body.delete_password, reply.delete_password, async (err, correct) => {
          if (err) {
            return console.log(err);
          }

          if (!correct) {
            return res.send('incorrect password');
          }

          replies[replyIndex].text = '[deleted]';
          try {
            await Thread.findByIdAndUpdate(threadId, { replies });
            res.send('success');
          } catch (err) {
            console.log(err);
          }
        });
      } catch (err) {
        console.log(err);
      }
    })
    .put(async (req, res) => {
      const threadId = req.body.thread_id;
      const replyId = req.body.reply_id;
      try {
        const thread = await Thread.findById(threadId);
        const replies = thread.replies;
        let replyIndex = -1;
        const reply = replies.find((reply, i) => {
          if (reply._id === replyId) {
            replyIndex = i;
            return true;
          }

          return false;
        });

        replies[replyIndex].reported = true;
        await Thread.findByIdAndUpdate(threadId, {
          replies,
        }, {
          new: true,
        });

        try {
          const response = await axios.post(process.env.WEBTASK_TWILIO, {
            type: 'reply',
            threadId,
            replyId,
            text: reply.text,
          });

          if (response.status === 200) {
            return res.send('success');
          }

          res.send('error messaging administrator');
        } catch (err) {
          console.log(err);
        }
      } catch (err) {
        console.log(err);
      }
    });
};

