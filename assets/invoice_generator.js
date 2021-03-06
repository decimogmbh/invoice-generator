/*!
 * decimo Invoice Generator
 * version: 0.8.7
 * Requires jQuery v1.11
 * Copyright (c) 2019 Mike Nagora (mike.nagora@rechnung.de)
 */

(function(window){
  var host_production = "https://my.decimo.de";
  var host_development = "https://development.decimo.de";
  
  // This function will contain all our code
  function InvoiceGenerator(){
    var _invoiceGeneratorObject = {};
    
    // This variable will be inaccessible to the user, only can be visible in the scope of your library.
    var settings = {
      container: "",
      token: "",
      callback: {},
      user_token: "",
      form: "",
      user_external_id: "",
      host: host_development,
      template: "standard",
      output: "customer",
      preload: true,
      privacy: false,
      business: "general"
    };

    var sender = null;
    var recipient = null;
    var modal = null;

    // Change a private property
    _invoiceGeneratorObject.init = function(options, callback){
        var self = this;
        settings.token = options.token;
        settings.container = "#" + options.container;
        settings.callback = callback;
        settings.user_token = (options.data && options.data.user) ? options.data.user.token : "";
        settings.user_external_id = (options.data && options.data.user) ? options.data.user.external_id : "";
        settings.form = settings.container + ' form.new_invoice';
        settings.source = options.source;
        
        if (options.env == "prod") {
          settings.host = host_production
        }

        if (options.hasOwnProperty("preload")) {
          settings.preload = options.preload
        }

        if (options.hasOwnProperty("privacy")) {
          settings.privacy = options.privacy
        }

        if (options.hasOwnProperty("template")) {
          settings.template = options.template
        }

        if (options.hasOwnProperty("output")) {
          settings.output = options.output
        }

        if (options.hasOwnProperty("business")) {
          settings.business = options.business
        }

        if (settings.preload) {
          $.getScript(settings.host + "/api_packs/decimo.js", function() {
            self.initGenerator(options);
          });  
        } else {
          self.initGenerator(options);
        }
          
    };

    _invoiceGeneratorObject.initGenerator = function(options){
      var self = this;

      if (!options.hasOwnProperty("data")) {
        data = {}
      }

      data = JSON.parse(JSON.stringify(options.data))

      if (settings.privacy) {
        data.from = {};
        data.to = {};
      }

      data["source"] = settings.source

      $.ajax({
        url : settings.host + "/api/v2/generator/invoice?pp=disable",
        headers: {
          'X-AUTH-TOKEN' : options.token
        },
        method: "POST",
        dataType: "html",
        data: data
      }).done(function(response) {
        $(settings.container).html(response); 

        self.initEvents();

        // initialize forms for passed customer data
        if (options.data && !settings.user_token && settings.privacy) {
          self.initFields(options.data);
        }

        // initialize recipient addresses and forms for registered customers 
        if (settings.user_token) {
          self.getAddress(settings.token, settings.user_token); 

          data = {
            from: {
              "firstname": $('input[id="user[first_name]"]').val(),
              "lastname": $('input[id="user[last_name]"]').val(),
              "name": $('input[id="user[name]"]').val(),
              "company": $('input[id="user[company]"]').val(),
              "email": $('input[id="user[email]"]').val(),
              "line1": $('input[id="user[line1]"]').val(),
              "zip": $('input[id="user[zip]"]').val(),
              "city": $('input[id="user[city]"]').val(),
              "country": $('input[id="user[country]"]').val(),
              "phone": $('input[id="user[phone]"]').val(),
              "tax_number_natural": $('input[id="user[tax_number_natural]"]').val(),
              "tax_number_legal": $('input[id="user[tax_number_legal]"]').val(),
              "vat_number": $('input[id="user[vat_number]"]').val(),
              "registry_number": $('input[id="user[registry_number]"]').val(),
              "legal_form": $('input[id="user[legal_form]"]').val(),
              "date_of_birth": $('input[id="user[date_of_birth]"]').val(),
              "customer_no": $('input[id="user[customer_no]"]').val()
            }
          }

          self.initFields(data);  
        } 
        
        // set external user id
        if (settings.user_external_id) {
          $('input[id="user[external_id]"]').val(settings.user_external_id);
        }

        $('input[name="sender[email]"]').change(function() {
          $('#send-to-email').text($(this).val());
          $('#user-registration-email').text($(this).val());
        });

        // initialize server functions
        if (window.reloadInvoiceGeneratorServer) {
          setTimeout(
            function () {
              window.reloadInvoiceGeneratorServer();
            },
            100
          );
        }

      }).fail(function(response) {
        settings.callback(JSON.parse(response.responseText));
      });
    }

    _invoiceGeneratorObject.initEvents = function(){
       var self = this;

        // set body CSS class
        $('body').addClass('decimo-generator');

        if (settings.user_token) {
          $('body').addClass('registered');
        }

        // initialize events
        $(document).on('click', settings.container + ' .send-to-button', function(e) {  
            if (localStorage.getItem("email-modal-displayed") == "true") {
              self.send_pdf($(settings.form).serialize());
            } else {
              $('#email-modal').modal('show');
            }
        });

        $(document).on('click', settings.container + ' button.send-pdf', function(e) {  
            $('#email-modal').modal('hide');
            
            // Save data to the current local store
            localStorage.setItem("email-modal-displayed", $('#email-modal').find('#email-modal-displayed').is(':checked'));
            
            self.send_pdf($(settings.form).serialize());
        });

        $(document).on('click', settings.container + ' .btn-invoice-save', function(e) {  
            e.preventDefault();

            if (settings.user_token) {
              self.submit($(settings.form).serialize());
            } else {
              $('#save-modal').modal('show');
            }
        });

        $(document).on('click', settings.container + ' .save-customer', function(e) {  
            $('#save-modal').modal('hide');
            self.submit($(settings.form).serialize());
        });   

        // set table mobile mode
        $( window ).resize(function() {
          setMobileMode();
        });

        setMobileMode();
    };

    _invoiceGeneratorObject.initFields = function(data){
        sender = $('.invoice-address.invoice-sender');
        recipient = $('.invoice-address.invoice-recipient');
        modal = $('#contact-modal');
        
        var self = this;

        // initialize sender address
        if (data.from) {

          $('input[id="user[name]"]').val(data.from.firstname + " " + data.from.lastname);
          $('input[id="user[company]"]').val(data.from.company);
          $('input[id="user[email]"]').val(data.from.email);
          $('input[id="user[line1]"]').val(data.from.line1);
          $('input[id="user[line2]"]').val(data.from.line2);
          $('input[id="user[zip]"]').val(data.from.zip);
          $('input[id="user[city]"]').val(data.from.city);
          $('input[id="user[country]"]').val(data.from.country);
          $('input[id="user[phone]"]').val(data.from.phone);
          $('input[id="user[vat_number]"]').val(data.from.vat_number);
          $('input[id="user[tax_number_legal]"]').val(data.from.tax_number_legal);
          $('input[id="user[tax_number_natural]"]').val(data.from.tax_number_natural);
          $('input[id="user[registry_number]"]').val(data.from.registry_number);
          $('input[id="user[legal_form]"]').val(data.from.legal_form);
          $('input[id="user[date_of_birth]"]').val(data.from.date_of_birth);
          $('input[id="user[customer_no]"]').val(data.from.customer_no);

          $('#send-to-email').text(setBlankForUndefined(data.from.email));
          $('#user-registration-email').text(setBlankForUndefined(data.from.email));

          setFullAddress(sender, data.from);
          setContactInfo(sender, data.from);

          sender.find('.data-vat-number').text(setBlankForUndefined(data.from.vat_number));
          sender.find('.data-tax-number-legal').text(setBlankForUndefined(data.from.tax_number_legal));
          sender.find('.data-tax-number-natural').text(setBlankForUndefined(data.from.tax_number_natural));
          sender.find('.data-registry-number').text(setBlankForUndefined(data.from.registry_number));

          if (data.from.registry_number) {
            sender.find('.data-registry-number').closest('div').removeClass('hidden');
          }

          if (data.from.tax_number_legal) {
            sender.find('.data-tax-number-legal').closest('div').removeClass('hidden');      
          }

          if (data.from.tax_number_natural) {
            sender.find('.data-tax-number-natural').closest('div').removeClass('hidden');      
          }

          if (data.from.vat_number) {
            sender.find('.data-vat-number').closest('div').removeClass('hidden');
          }

          if (data.from.bank_holder) {
            $('input[name="user[bank_holder]"]').val(data.from.bank_holder)
          }

          if (data.from.bank_iban) {
            $('input[name="user[bank_iban]"]').val(data.from.bank_iban)   
          }       

          //set data in modal
          setFormField($('input[name="sender[first_name]"]'), data.from.firstname);
          setFormField($('input[name="sender[last_name]"]'), data.from.lastname);
          setFormField($('input[name="sender[company]"]'), data.from.company);
          setFormField($('input[name="sender[email]"]'), data.from.email);
          setFormField($('input[name="sender[line1]"]'), data.from.line1);
          setFormField($('input[name="sender[line2]"]'), data.from.line2);
          setFormField($('input[name="sender[zip]"]'), data.from.zip);
          setFormField($('input[name="sender[city]"]'), data.from.city);
          setFormField($('input[name="sender[country]"]'), data.from.country);
          setFormField($('input[name="sender[phone]"]'), data.from.phone);
          setFormField($('input[name="sender[vat_number]"]'), data.from.vat_number);
          setFormField($('input[name="sender[tax_number_natural]"]'), data.from.tax_number_natural);
          setFormField($('input[name="sender[tax_number_legal]"]'), data.from.tax_number_legal);
          setFormField($('input[name="sender[registry_number]"]'), data.from.registry_number);
          setFormField($('input[name="sender[email]"]'), data.from.email);
          setFormField($('input[name="sender[phone]"]'), data.from.phone);
          setFormField($('input[name="sender[date_of_birth]"]'), data.from.date_of_birth);
        }

        // initialize recipient address
        if (data.to) {
          $('input[id="recipient[name]"]').val(getName(data.to));
          $('input[id="recipient[email]"]').val(data.to.email);
          $('input[id="recipient[line1]"]').val(data.to.line1);
          $('input[id="recipient[line2]"]').val(data.to.line2);
          $('input[id="recipient[zip]"]').val(data.to.zip);
          $('input[id="recipient[city]"]').val(data.to.city);
          $('input[id="recipient[country]"]').val(data.to.country);
          $('input[id="recipient[phone]"]').val(data.to.phone);

          setFullAddress(recipient, data.to);
        }        
    };

    _invoiceGeneratorObject.submit = function(data){
    $.ajax({
      url : settings.host + "/api/v2/generator/submit",
        headers: {
            'X-AUTH-TOKEN' : settings.token
        },
        method: "POST",
        data: data
    }).done(function(response){
        settings.callback(response);
      }).fail(function(response) {
        settings.callback(response.responseJSON)
      });
    };

    _invoiceGeneratorObject.send_pdf = function(data){
    $.ajax({
      url : settings.host + "/api/v2/generator/send_pdf",
        headers: {
            'X-AUTH-TOKEN' : settings.token
        },
        method: "POST",
        data: data
    }).done(function(response){
        settings.callback(response);
      }).fail(function(response) {
      settings.callback(response.responseJSON);
      });
    };

    _invoiceGeneratorObject.getAddress = function(token, user_id){
      $.ajax({
        url : settings.host + "/api/v2/generator/recipient",
        headers: {
            'X-AUTH-TOKEN' : token
        },
        method: "POST",
        data: {
          user_token: user_id
        }
      }).done(function(response){
        var contacts_count = response.contacts.length
        $.each(response.contacts, function(index, value) {
          item = $('.modal#contact-modal').find('.contact-item:first');
          row = item.parents('.row');

          item.attr('data-id', value.id);
          item.find('.display-name').text(value.name);
          item.find('.line1').text(value.line1);
          item.find('.zip').text(value.zip);
          item.find('.city').text(value.city);
          item.find('.country').text(countryLabelLong(value.country));
          item.find('.country_code').text(value.country);

          if (contacts_count == 0) {
            item.addClass("hidden")
          }
          if (contacts_count > 1) {
            row.prepend(item);

            if ((contacts_count - 1) != index) {
              row.prepend(item.clone());
            }
          }
        });
      }).fail(function(response) {
        settings.callback(response.responseJSON)
      });
    };

    return _invoiceGeneratorObject;
  }

  function setFormField(field, value) {
    if (value && value != "" && typeof(value) !== "undefined") {
      field.val(value);
      field.parents('.form-group').removeClass('is-empty');
    }
  }

  function getName(data) {
    let name = setBlankForUndefined(data.firstname) + ' ' + setBlankForUndefined(data.lastname)
    if (data.company !== "undefined" &&  data.company !== "" && data.company !== undefined) {
      name = setBlankForUndefined(data.company)
    }

    return name
  }

  function setFullAddress(object, data) {
    let name = getName(data);
    let output = "";

    output = '<p>' + name;
    output += '<br>' + setBlankForUndefined(data.line1);
    
    if (data.line2) {
      output += '<br>' + setBlankForUndefined(data.line2);
    }

    output += '<br>' + setBlankForUndefined(data.zip) + ' ' + setBlankForUndefined(data.city);
    output += '<br>' + countryLabelLong(setBlankForUndefined(data.country)) + '</p>';
      
    object.find('.data-full-address').html(output);
  }

  function setContactInfo(object, data) {
    object.find('.data-contact-info').html(
      '<p>' + setBlankForUndefined(data.email) + 
      '<br>' + setBlankForUndefined(data.phone) + '</p>'
    );
  }

  function countryLabelLong(country) {
    switch(country) {
      case 'DE': return 'Deutschland'; break;
      case 'CH': return 'Schweiz'; break;
      case 'AT': return 'Österreich'; break;
      case '' :  return ''; break;
    }
  }

  function setBlankForUndefined(attribute) {
    if (!attribute || typeof(attribute) == "undefined") {
      attribute = "";
    } 

    return attribute;
  }

  function setMobileMode() {
    if ($('#generator').outerWidth() < 832) {
      $(".invoice").toggleClass("mobile", true);
    } else {
      $(".invoice").toggleClass("mobile", false);
    }
  }

  // We need that our library is globally accesible, then we save in the window
  if(typeof(window.InvoiceGenerator) === 'undefined'){
    window.InvoiceGenerator = InvoiceGenerator();
  }
})(window); // We send the window variable withing our function
