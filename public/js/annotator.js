$(function() {

  // Get URL Parameters (GUP)
  function gup (name) {
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(window.location.href);
    return (results === null) ? "" : results[1];
  }

  // Get the assignment ID
  var assignmentId = gup("assignmentId");
  var noAssignmentId = (!assignmentId ||
                        assignmentId === "ASSIGNMENT_ID_NOT_AVAILABLE");
  var batchId = gup("batchId");
  var dataId = gup("dataId");
  $("#assignmentId").val(assignmentId);
  $("#batchId").val(batchId);
  $("#dataId").val(dataId);
  if (noAssignmentId) {
    // We are previewing the HIT. Display helpful message
    $("#acceptHITWarning").show();
  }
  if (gup("turkSubmitTo").indexOf("workersandbox") !== -1) {
    // Sandbox mode
    $("#answerForm")
      .attr("action", "https://workersandbox.mturk.com/mturk/externalSubmit");
  } else if (gup("debug") === "true") {
    // Debug mode
    $("#answerForm")
      .attr("action", "javascript:alert('debug!')");
  } else {
    // Real mode
    $("#answerForm")
      .attr("action", "https://www.mturk.com/mturk/externalSubmit");
  }

  ////////////////////////////////////////////////////////////////
  // Globals

  var frameDoc = document.getElementById('webpage').contentDocument;
  var frameWin = document.getElementById('webpage').contentWindow;

  const NUM_QUESTIONS = 5;
  var questionDivs = [], currentQuestion;

  ////////////////////////////////////////////////////////////////
  // Form submission

  var iWillSubmit = false;

  $('#submitButton').click(function () {
    iWillSubmit = true;
    $('#answerForm').submit();
  });
  
  $('#submitButton').keyup(function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 13 || keyCode === 32) {
      iWillSubmit = true;
      $('#answerForm').submit();
    }
  });

  function clean(text, cleanNewlines) {
    var answer = [];
    text.split(/\n/).forEach(function (x) {
      x = x.replace(/\s+/g, ' ').replace(/^ | $/g, '');
      if (x.length) answer.push(x);
    });
    return answer.join(cleanNewlines ? " " : "\n");
  }

  function checkAnswers() {
    for (let i = 0; i < NUM_QUESTIONS; i++) {
      let box = frameDoc.getElementById('ANNOTATIONBOX' + i);
      if (box.style.borderColor !== 'green') {
        goToQuestion(i);
        return 'Question ' + (i+1) + ' does not have a highlighted element';
      }
      for (let j = 0; j < NUM_INPUTS_PER_QUESTION; j++) {
        let text = clean($('#a' + i + '' + j).val());
        $('#a' + i + '' + j).val(text);
        if (!text.length) {
          goToQuestion(i);
          return 'Question ' + (i+1) + ' is missing answer ' + (j+1);
        }
        for (let k = 0; k < j; k++) {
          if ($('#a' + i + '' + k).val() == text) {
            goToQuestion(i);
            return 'Question ' + (i+1) + ' has repeated answers';
          }
        }
      }
    }
    return true;
  }

  $('form').submit(function() {
    if (!iWillSubmit) return false;
    // Check if all text fields are filled.
    var check = checkAnswers();
    if (check === true) {
      $('#validationWarning').hide();
      $('#submitButton').prop('disabled', true);
      return true;
    } else {
      $('#validationWarning').text('ERROR: ' + check).show();
      return false;
    }
  });

  ////////////////////////////////////////////////////////////////
  // Instructions

  function toggleInstructions(state) {
    $("#showingInstruction").toggle(!!state);
    $("#hidingInstruction").toggle(!state);
  }

  $("#showInstructionButton").click(function () {
    toggleInstructions(true);
  });

  $("#hideInstructionButton").click(function () {
    toggleInstructions(false);
  });

  ////////////////////////////////////////////////////////////////
  // Web page interaction

  var isSelectionMode = false, currentElement = null;

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
        'background-color': 'rgba(255,255,255,0.5)',
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
      'top': rect.top - docRect.top,
      'left': rect.left - docRect.left,
      'height': rect.height,
      'width': rect.width,
      'border-color': color,
    });
    currentElement = el;
  }

  function enableSelectMode() {
    isSelectionMode = true;  
    $('#answerForm input, #answerForm button').prop('disabled', true);
  }

  function selectElement(element) {
    moveBox(element, 'green');
    $('#e' + currentQuestion).val($(element).data('xid'));
    isSelectionMode = false;
    currentElement = null;
    $('#answerForm input').prop('disabled', noAssignmentId);
    $('#answerForm button').prop('disabled', false);
    $('#prevButton').prop('disabled', currentQuestion === 0);
  }

  function hackPage() {
    frameWin.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    })
    frameWin.addEventListener('mousedown', function(e) {
      if (isSelectionMode) {
        selectElement(e.target);
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    })
    frameWin.addEventListener('keypress', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    })
    frameWin.addEventListener('mouseover', function(e) {
      if (isSelectionMode && e.target !== currentElement) {
        moveBox(e.target, 'red')
      }
    })
  }

  ////////////////////////////////////////////////////////////////
  // Load data

  function createQuestionDiv(i) {
    var questionDiv = $('<div class=question>');
    questionDiv.append($('<input type=hidden>')
        .attr('id', 'e' + i).attr('name', 'e' + i));
    // Command
    $('<h2>').text('Command ' + (i+1)).appendTo(questionDiv);
    questionDiv.append($('<p class=answerRow>')
        .append($('<textarea disabled>')
          .attr('id', 'a' + i).attr('name', 'a' + i)
          .val(noAssignmentId ? 'PREVIEW MODE' : '')));
    // Highlight
    questionDiv.append($('<p class=buttonRow>')
        .append($('<button type=button class=selectElementButton>')
          .text('Highlight Element')
          .click(function () {
            currentQuestion = i;
            enableSelectMode();
          })));
    return questionDiv;
  }

  function finalizeLoading() {
    // Show / Hide instructions
    $("#hideInstructionButton").text("Hide").prop('disabled', false);
    toggleInstructions(noAssignmentId);
    if (!noAssignmentId) {
      $('.question textarea, .question input, #submitButton').prop('disabled', false);
      $('#a1').focus();
    }
  }

  // Load the page!
  $.get('pages/' + dataId + '.json', function (data) {
    if (data.processedhtml === undefined) {
      if (data.html) {
        data.processedhtml = data.html
      } else {
        alert('Bad URL: "' + dataId + '" -- Please contact the requester');
        return;
      }
    } 
    $('input[name="url"]').val(data.url);
    frameDoc.documentElement.innerHTML = data.processedhtml;
    hackPage();
    // Add question divs
    if (assignmentId === 'view') {
      // TODO: View mode
    } else {
      for (let i = 0; i < NUM_QUESTIONS; i++) {
        questionDivs.push(createQuestionDiv(i).appendTo('#questionWrapper'));
        buildBox(i);
      }
      finalizeLoading();
    }
  }).fail(function () {
    alert('Bad URL: "' + dataId + '" -- Please contact the requester');
  });

  $(window).resize(function (event) {
    for (let i = 0; i < NUM_QUESTIONS; i++) {
      xid = $('#e' + i).val();
      if (xid !== '') {
        moveBox($(frameDoc).find("[data-xid='" + xid + "']")[0], 'green', i);
      }
    }
  });

});
