/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', async function() {
const threadIdPromise1 = new Promise((resolve1, reject1) => {
  suite('API ROUTING FOR /api/threads/:board', async function() {
    
    suite('POST', function() {
      test('Post a thread', done => {
        chai.request(server)
          .post('/api/threads/test')
          .send({
            text: 'Thread for functional test - API routing for /api/threads/test POST request',
            delete_password: '12345',
          })
          .end((err, res) => {
            assert.isNull(err);
            done();
          })
      });
    });
    
  const threadIdPromise2 = new Promise((resolve2, reject2) => {
    suite('GET', function() {
      test('Get up to 10 most recent bumped threads with 3 most recent replies for each thread', done => {
        chai.request(server)
          .get('/api/threads/test')
          .end((err, res) => {
            assert.isNull(err);
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isAtMost(res.body.length, 10);
            assert.isObject(res.body[0]);
            assert.property(res.body[0], '_id');
            assert.property(res.body[0], 'text');
            assert.property(res.body[0], 'created_on');
            assert.property(res.body[0], 'bumped_on');
            assert.property(res.body[0], 'replies');
            assert.isArray(res.body[0].replies);
            assert.isAtMost(res.body[0].replies, 3);
            resolve1(res.body[1]._id);
            resolve2([res.body[0]._id, res.body[1]._id,]);
            done();
          });
      });
    });
  });
    
    const threadIds = await threadIdPromise2;
    suite('DELETE', function() {
      test('Delete a thread with thread_id and delete_password', done => {
        chai.request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: threadIds[0],
            delete_password: '12345',
          })
          .end((err, res) => {
            assert.isNull(err);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
    suite('PUT', function() {
      test('Report a thread with thread_id (the functional test may time out and fail because the FAAS I\'m using to send SMS report has 1 call/second limit)', done => {
        chai.request(server)
          .put('/api/threads/test')
          .send({
            thread_id: threadIds[1],
          })
          .end((err, res) => {
            assert.isNull(err);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    

  });
});

  const threadId = await threadIdPromise1;
  suite('API ROUTING FOR /api/replies/:board', async function() {

    suite('POST', function() {
      test('Post a reply to a thread with thread_id and delete_password', done => {
        chai.request(server)
          .post('/api/replies/test')
          .send({
            thread_id: threadId,
            delete_password: '12345',
            text: 'Test reply for API routing',
          })
          .end((err, res) => {
            assert.isNull(err);
            done();
          });
      });
    });
    
  const replyIdPromise = new Promise((resolve, reject) => {
    suite('GET', function() {
      test('Get an entire thread with all its replies with thread_id', done => {
        chai.request(server)
          .get('/api/replies/test')
          .query({
            thread_id: threadId,
          })
          .end((err, res) => {
            assert.isNull(err);
            assert.isObject(res.body);
            assert.property(res.body, '_id');
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies);
            assert.isObject(res.body.replies[0]);
            assert.property(res.body.replies[0], '_id');
            assert.property(res.body.replies[0], 'text');
            assert.property(res.body.replies[0], 'created_on');
            resolve(res.body.replies[0]._id);
            done();
          });
      });
    });
  });

    const replyId = await replyIdPromise;    
    suite('PUT', function() {
      test('Report a reply using thread_id and reply_id (the functional test may time out and fail because the FAAS I\'m using to send SMS report has 1 call/second limit)', done => {
        chai.request(server)
          .put('/api/replies/test')
          .send({
            thread_id: threadId,
            reply_id: replyId,
          })
          .end((err, res) => {
            assert.isNull(err);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
    suite('DELETE', function() {
      test('Delete a reply with thread_id, reply_id, and delete_password', done => {
        chai.request(server)
          .delete('/api/replies/test')
          .send({
            thread_id: threadId,
            reply_id: replyId,
            delete_password: '12345',
          })
          .end((err, res) => {
            assert.isNull(err);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
  });

});
