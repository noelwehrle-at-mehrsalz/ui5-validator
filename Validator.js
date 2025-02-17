sap.ui.define(
  [
    "sap/ui/core/message/Message",
    "sap/ui/core/MessageType",
    "sap/ui/core/ValueState"
  ],
  function(Message, MessageType, ValueState) {
    "use strict";

    /**
     * @name        nl.qualiture.plunk.demo.utils.Validator
     *
     * @class
     * @classdesc   Validator class.<br/>
     *
     * @version     Oktober 2015
     * @author      Robin van het Hof
     */
    var Validator = function() {
      this._isValid = true;
      this._isValidationPerformed = false;
      this._aPossibleAggregations = [
        "items",
        "content",
        "form",
        "formContainers",
        "formElements",
        "fields",
        "sections",
        "subSections",
        "_grid",
        "cells",
        "_page"
      ];
      this._aValidateProperties = ["value", "selectedKey", "text"]; // yes, I want to validate Select and Text controls too
      this._validationMessages = []; // Initialize an array to keep track of validation messages
    };

    /**
     * Returns true _only_ when the form validation has been performed, and no validation errors were found
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @returns {boolean}
     */
    Validator.prototype.isValid = function() {
      return this._isValidationPerformed && this._isValid;
    };

    /**
     * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     * @return {boolean} whether the oControl is valid or not.
     */
    Validator.prototype.validate = function(oControl) {
      this._isValid = true;
      // Remove only messages that were added during the previous validation cycle
      if (this._validationMessages.length > 0) {
        sap.ui.getCore().getMessageManager().removeMessages(this._validationMessages);
        this._validationMessages = []; // Clear the reference after removing the messages
      }
      this._validate(oControl);
      return this.isValid();
    };

    /**
     * Clear the value state of all the controls
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     */
    Validator.prototype.clearValueState = function(oControl) {
      if (!oControl) return;

      if (oControl.setValueState) oControl.setValueState(ValueState.None);

      this._recursiveCall(oControl, this.clearValueState);
    };

    /**
     * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     */
    Validator.prototype._validate = function(oControl) {
      var i,
        isValidatedControl = false,
        isValid = true;

      // only validate controls and elements which have a 'visible' property
      // and are visible controls (invisible controls make no sense checking)
      if (
        !(
          (oControl instanceof sap.ui.core.Control ||
            oControl instanceof sap.ui.layout.form.FormContainer ||
            oControl instanceof sap.ui.layout.form.FormElement ||
            oControl instanceof sap.m.IconTabFilter) &&
          oControl.getVisible()
        )
      ) {
        return;
      }

      if (oControl.getRequired && oControl.getRequired() === true && oControl.getEnabled && oControl.getEnabled() === true) {
        // Control required
        isValid = this._validateRequired(oControl);
        isValidatedControl = true;
      } 

      if ( isValid && ( (i = this._hasType(oControl)) !== -1 && oControl.getEnabled && oControl.getEnabled() === true ) ) {
        // Control constraints
        isValid = this._validateConstraint(oControl, i);
        isValidatedControl = true;

      }

      if ( isValid && ( oControl.getValueState && oControl.getValueState() === ValueState.Error ) ) {
        // Control custom validation
        isValid = false;
        this._setValueState(oControl, ValueState.Error, "Wrong input");
        isValidatedControl = true;
      }

      if (!isValid) {
        this._isValid = false;
        this._addMessage(oControl);
      }

      // if the control could not be validated, it may have aggregations
      if (!isValidatedControl) {
        this._recursiveCall(oControl, this._validate);
      }
      this._isValidationPerformed = true;
    };

    /**
     * Check if the control is required
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     * @return {bool} this._isValid - If the property is valid
     */
    Validator.prototype._validateRequired = function(oControl) {
      // check control for any properties worth validating
      var isValid = true;

      for (var i = 0; i < this._aValidateProperties.length; i += 1) {
        try {
          oControl.getBinding(this._aValidateProperties[i]);
          var oExternalValue = oControl.getProperty(
            this._aValidateProperties[i]
          );

          if (!oExternalValue || oExternalValue === "") {
            this._setValueState(
              oControl,
              ValueState.Error,
              "Please fill this mandatory field!"
            );
            isValid = false;
          } else if (
            oControl.getAggregation("picker") &&
            oControl.getProperty("selectedKey").length === 0
          ) {
            // might be a select
            this._setValueState(
              oControl,
              ValueState.Error,
              "Please choose an entry!"
            );
            isValid = false;
          } else {
            oControl.setValueState(ValueState.None);
            isValid = true;
            break;
          }
        } catch (ex) {
          // Validation failed
        }
      }
      return isValid;
    };

    /**
     * Check if the control is required
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     * @param {int} i - The index of the property
     * @return {bool} this._isValid - If the property is valid
     */
    Validator.prototype._validateConstraint = function(oControl, i) {
      var isValid = true;

      try {
        var editable = oControl.getProperty("editable");
      } catch (ex) {
        editable = true;
      }

      if (editable) {
        try {
          // try validating the bound value
          var oControlBinding = oControl.getBinding(
            this._aValidateProperties[i]
          );
          var oExternalValue = oControl.getProperty(
            this._aValidateProperties[i]
          );
          var oInternalValue = oControlBinding
            .getType()
            .parseValue(oExternalValue, oControlBinding.sInternalType);
          oControlBinding.getType().validateValue(oInternalValue);
          oControl.setValueState(ValueState.None);
        } catch (ex) {
          // catch any validation errors
          isValid = false;
          this._setValueState(oControl, ValueState.Error, ex.message);
        }
      }
      return isValid;
    };

    /**
     * Add message to the MessageManager
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     * @param {string} sMessage - Customize the message
     */
    Validator.prototype._addMessage = function(oControl, sMessage) {
      var sLabel,
        eMessageType = MessageType.Error;
      var sControlId = oControl.getId(); // Get the control ID
      var sBindingProperty = this._getRelevantBindingProperty(oControl); // Get the relevant property for the target
      var oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
      var sTarget = sControlId + "/" + sBindingProperty;

      sMessage = oControl.getValueStateText ? oControl.getValueStateText() : sMessage; // Get Message from ValueStateText if available
      sMessage ??= "Wrong input"; // Default message

      switch (oControl.getMetadata().getName()) {
        case "sap.m.CheckBox":
        case "sap.m.Input":
        case "sap.m.Select":
          sLabel = oControl
            .getParent()
            .getLabel ? oControl
            .getParent()
            .getLabel()
            .getText() : "No Label Found";
          break;
      }

      if (oControl.getValueState)
        eMessageType = this._convertValueStateToMessageType(
          oControl.getValueState()
        );

      // Get existing messages for the same target
      var aExistingMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData().filter(function(oMessage) {
        return oMessage.target === sTarget;
      });

      // Check if the message already exists
      var bMessageExists = aExistingMessages.some(function(oMessage) {
        return oMessage.message === sMessage && oMessage.type === eMessageType;
      });

      if (!bMessageExists) {
        var oMessage = new Message({
          message: sMessage,
          type: eMessageType,
          additionalText: sLabel, // Get label from the form element
          target: sControlId + "/" + sBindingProperty, // Set the target as control ID and property
          processor: oMessageProcessor
        });

        sap.ui
          .getCore()
          .getMessageManager()
          .addMessages(
            oMessage
          );

        // Keep track of validation messages
        this._validationMessages.push(oMessage);
      }
    };

    /**
     * Check if the control property has a data type, then returns the index of the property to validate
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     * @return {int} i - The index of the property to validate
     */
    Validator.prototype._hasType = function(oControl) {
      // check if a data type exists (which may have validation constraints)
      for (var i = 0; i < this._aValidateProperties.length; i += 1) {
        if (
          oControl.getBinding(this._aValidateProperties[i]) &&
          oControl.getBinding(this._aValidateProperties[i]).getType()
        )
          return i;
      }
      return -1;
    };

    /**
     * Set ValueState and ValueStateText of the control
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {sap.ui.core.ValueState} eValueState - The ValueState to be set
     * @param {string} sText - The ValueStateText to be set
     */
    Validator.prototype._setValueState = function(
      oControl,
      eValueState,
      sText
    ) {
      oControl.setValueState(eValueState);
      if (oControl.getValueStateText && !oControl.getValueStateText())
        oControl.setValueStateText(sText);
    };

    /**
     * Recursively calls the function on all the children of the aggregation
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
     * @param {function} fFunction - The function to call recursively
     */
    Validator.prototype._recursiveCall = function(oControl, fFunction) {
      for (var i = 0; i < this._aPossibleAggregations.length; i += 1) {
        var aControlAggregation = oControl.getAggregation(
          this._aPossibleAggregations[i]
        );

        if (!aControlAggregation) continue;

        if (aControlAggregation instanceof Array) {
          // generally, aggregations are of type Array
          for (var j = 0; j < aControlAggregation.length; j += 1) {
            fFunction.call(this, aControlAggregation[j]);
          }
        } else {
          // ...however, with sap.ui.layout.form.Form, it is a single object *sigh*
          fFunction.call(this, aControlAggregation);
        }
      }
    };

    /**
     * Recursively calls the function on all the children of the aggregation
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     *
     * @param {sap.ui.core.ValueState} eValueState
     * @return {sap.ui.core.MessageType} eMessageType
     */
    Validator.prototype._convertValueStateToMessageType = function(
      eValueState
    ) {
      var eMessageType;

      switch (eValueState) {
        case ValueState.Error:
          eMessageType = MessageType.Error;
          break;
        case ValueState.Information:
          eMessageType = MessageType.Information;
          break;
        case ValueState.None:
          eMessageType = MessageType.None;
          break;
        case ValueState.Success:
          eMessageType = MessageType.Success;
          break;
        case ValueState.Warning:
          eMessageType = MessageType.Warning;
          break;
        default:
          eMessageType = MessageType.Error;
      }
      return eMessageType;
    };

    /**
     * Retrieves the relevant binding property of the control.
     * This is used to identify which property of the control is involved in the validation.
     * 
     * @memberof nl.qualiture.plunk.demo.utils.Validator
     * @param {sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement} oControl - The control to get the binding property from.
     * @returns {string|null} The binding property name if available, otherwise null.
     */
    Validator.prototype._getRelevantBindingProperty = function(oControl) {
      var sProperty = null;
      this._aValidateProperties.some(function(sProp) {
        if (oControl.getBinding(sProp)) {
          sProperty = sProp;
          return true;
        }
        return false;
      });
      return sProperty;
    };


    return Validator;
  }
);
