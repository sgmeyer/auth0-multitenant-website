var express = require('express');
var passport = require('passport');
var router = express.Router();
var querystring = require('querystring');

var tenant = require('../lib/tenant');

/* GET home page. */
router.get('/', 
  function(req, res, next) {
    if (req.user) {
      res.redirect('/user');
    }

    res.render('index', { title: 'Multi-tenant App!' });
  });

router.get('/login',
  tenant.setCurrent(),
  function(req, res) {
    // use session to pass login tenant (if one exists) through login flow
    req.session.loginTenant = req.tenant;

    var query = querystring.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      response_type: 'code',
      scopes: 'openid profile bar',
      redirect_uri: `http://${process.env.ROOT_DOMAIN}:${process.env.PORT}/callback`
    });

    res.redirect(`https://${process.env.AUTH0_DOMAIN}/authorize?${query}`);
  });

router.get('/logout', 
  function(req, res){
    req.logout();
    res.redirect('/');
  });

router.get('/callback',
  passport.authenticate('auth0', { failWithError: true }),
  tenant.setCurrent(req => req.session.loginTenant),
  tenant.ensureCurrent(),
  function(req, res) {
    var path = req.session.returnTo || '/user';
    var url = `http://${req.tenant}.${process.env.ROOT_DOMAIN}:${process.env.PORT}${path}`;

    // clear session values used to complete login flow
    delete req.session.loginTenant;
    delete req.session.returnTo;

    res.redirect(url);
  },
  function(err, req, res, next) {
    if (err.constructor.name === 'AuthenticationError') {
      err.description = req.query.error_description;
      return res.json(err);
    }

    next(err);
  });

module.exports = router;
