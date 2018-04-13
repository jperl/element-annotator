$(function() {

  // Get URL Parameters (GUP)
  function gup (name) {
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(window.location.href);
    return (results === null) ? "" : results[1];
  }

  var batchId = gup("batchId");
  var dataId = gup("dataId");

  ////////////////////////////////////////////////////////////////
  // Globals

  var frame = document.getElementById('webpage')
  var frameDoc = frame.contentDocument;
  var frameWin = frame.contentWindow;

  var NUM_QUESTIONS;
  var questionDivs = [], currentQuestion;

  ////////////////////////////////////////////////////////////////
  // Web page interaction

  function buildBox(index) {
    frameDoc.body.appendChild($('<div>')
      .attr('id', 'ANNOTATIONBOX' + index)
      .text(index + 1)
      .css({
        'border': '5px solid red',
        'box-sizing': 'border-box',
        '-moz-box-sizing': 'border-box',
        '-webkit-box-sizing': 'border-box',
        'position': 'absolute',
        'pointer-events': 'none',
        'z-index': 999999999,
        'color': 'black',
        'font-size': '30px',
        'font-weight': 'bold',
        'overflow': 'visible',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'center',
      }).hide()[0]);
  }

  function moveBox(el, color, index) {
    if (index === undefined) index = currentQuestion;
    var box = frameDoc.getElementById('ANNOTATIONBOX' + index);
    var rect = el.getBoundingClientRect();
    var docRect = frameDoc.body.getBoundingClientRect();
    $(box).show().css({
      'top': $(el).offset().top,
      'left': $(el).offset().left,
      'height': rect.height,
      'width': rect.width,
      'border-color': color,
    });
    currentElement = el;
  }

  function refreshAllBoxes() {
    for (let i = 0; i < NUM_QUESTIONS; i++) {
      xid = $('#e' + i).val();
      if (xid !== '') {
        moveBox($(frameDoc).find("[data-xid='" + xid + "']")[0], 'green', i);
      }
    }
  }
  $(window).resize(refreshAllBoxes);

  var currentFocus = -1;
  function focusBox(index) {
    currentFocus = index;
    for (let i = 0; i < NUM_QUESTIONS; i++) {
      var box = $(frameDoc.getElementById('ANNOTATIONBOX' + i));
      if (index === -1) {
        box.css({'color': 'black', 'border': '5px solid green', 'box-shadow': ''});
      } else if (index === i) {
        box.css({'color': 'transparent', 'border': '1px solid red',
          'box-shadow': '0 0 30px 10px #ff0, 0 0 0 100000px rgba(0, 0, 0, 20%)'});
        // If off-screen, scroll to that element
        if (box.offset().top < $(frameWin).scrollTop()) {
          $(frameDoc).scrollTop(box.offset().top - 100);
        } else if (box.offset().top + box.height() >
            $(frameWin).scrollTop() + frameWin.innerHeight) {
          $(frameDoc).scrollTop(box.offset().top - 100);
        }
      } else {
        box.css({'color': 'transparent', 'border': '', 'box-shadow': ''});
      }
    }
  }

  function hackPage() {
    frameWin.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    })
    frameWin.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    })
    frameWin.addEventListener('keypress', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    })
  }

  ////////////////////////////////////////////////////////////////
  // Load data

  function createViewDiv(i, result) {
    var questionDiv = $('<div class=question>');
    questionDiv.append($('<input type=hidden>')
        .attr('id', 'e' + i).attr('name', 'e' + i).val(result.xid));
    // Command
    $('<h2>').text('Command ' + (i+1)).appendTo(questionDiv);
    result.answers.forEach(function (answer) {
      $('<p>').text(answer.phrase).appendTo(questionDiv);
    });
    // Event
    /*
    questionDiv.click(function (e) {
      if (questionDiv.hasClass('focused')) {
        $('.question').removeClass('focused');
        focusBox(-1);
      } else {
        $('.question').removeClass('focused');
        questionDiv.addClass('focused');
        focusBox(i);
      }
      refreshAllBoxes();
    });
    */
    questionDiv.mousemove(function (e) {
      questionDiv.addClass('focused');
      focusBox(i);
    }).mouseout(function (e) {
      $('.question').removeClass('focused');
      if (currentFocus == i) {
        focusBox(-1);
      }
    });
    return questionDiv;
  }

  // Load the page!
  $.get('pages/' + dataId + '.html', function (data) {
    //frameDoc.documentElement.innerHTML = data;
    frameDoc.open()
    frameDoc.write(data);
    frameDoc.close();
    hackPage();
    $.get('results/ans-' + dataId + '.json', function (results) {
      NUM_QUESTIONS = results.length;
      results.forEach(function (result, i) {
        questionDivs.push(createViewDiv(i, result).appendTo('#questionWrapper'));
        buildBox(i);
      });
      refreshAllBoxes();
      setTimeout(refreshAllBoxes, 1000);
      setTimeout(refreshAllBoxes, 2000);
      setTimeout(refreshAllBoxes, 3000);
    });
  }).fail(function () {
    alert('Bad URL: "' + dataId + '" -- Please contact the requester');
  });

});