// Instatiate which API to
let api = "";
let apiUrlCall = "";
let apiLogText = "";
let MissingFields = "";
let CommentsNullFlag = 0;
let OtherInfoNullFlag = 0;
let svcorderType = "";
const searchFields = [
  "socoMLP$service_order.soco_start_custinfo_title",
  "socoMLP$service_order.soco_start_custinfo_suffix",
  "socoMLP$service_order.soco_start_custinfo_Fname",
  "socoMLP$service_order.soco_start_custinfo_Lname",
  "socoMLP$service_order.soco_start_custinfo_Mname",
  "socoMLP$service_order.soco_start_custinfo_SSN",
  "socoMLP$service_order.soco_start_custinfo_primaryph",
  "socoMLP$service_order.soco_start_custinfo_alternatep",
  "socoMLP$service_order.soco_start_custinfo_dob",
  "socoMLP$service_order.soco_start_custinfo_emailAddr",
  "socoMLP$service_order.soco_start_custinfo_noEmail",
  "socoMLP$service_order.soco_start_lease_emailAddr",
  "socoMLP$service_order.soco_start_paperless_emailAddr",
  "socoMLP$service_order.soco_start_custinfo_otherinfo",
  "socoMLP$service_order.soco_start_custinfo_driverslic",
  "socoMLP$service_order.soco_start_custinfo_state",
  "socoMLP$service_order.soco_start_custinfo_noSsn",
  "socoMLP$service_order.soco_start_custinfo_comments",
  "Contact.socoMLP$soco_customer_number",
  "socoMLP$service_order.soco_service_order_type",
];

function getCreditDecision(code) {
  let decisioncode = "";
  switch (code) {
    case "DR":
      decisioncode = "Deposit Risk";
      break;
    case "NI":
      decisioncode = "No Credit Information";
      break;
    case "NO":
      decisioncode = "No Record";
      break;
    case "NR":
      decisioncode = "No Deposit Required";
      break;
    case "RC":
      decisioncode = "Refer CR Coordinator";
      break;
    case "":
      decisioncode = "";
      break;
    default:
      break;
  }
  return decisioncode;
}

/* Add Customer */
function buildAddCustomerRequest(provider, globContext) {
  return new Promise((resolve, reject) => {
    svcorderType = "";
    provider.registerWorkspaceExtension((wsRecord) => {
      globContext.invokeAction("getLoggedInDetails").then((loggedInName) => {
        const userDetails = loggedInName.result.find((i) => i != null);
        const userId = userDetails.login.split("@")[0].toUpperCase();
        const userLogin = userDetails.login;
        const userPhone = userDetails.phone;

        const Request = {};
        const Payload = {};
        const BaseRequest = {};
        // Paylod Base for Create
        const CreateCustomerRequest = {};
        // Paylod Base for update
        const UpdateCustomer = {};

        BaseRequest.transactionId = getCurrentTimestamp();
        BaseRequest.userId = userId;

        wsRecord.getFieldValues(searchFields).then((FieldDetails) => {
          svcorderType = FieldDetails.getField("socoMLP$service_order.soco_service_order_type").getLabel();
          CreateCustomerRequest.contactType = "I";
          const prefix = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_title").getLabel();
          CreateCustomerRequest.prefix = prefix === "Select..." || prefix === "" ? "" : prefix.toUpperCase();
          CreateCustomerRequest.firstName = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel()
            ? FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel().toUpperCase()
            : "";
          CreateCustomerRequest.middleName = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Mname").getLabel()
            ? FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Mname").getLabel().toUpperCase()
            : "";
          CreateCustomerRequest.lastName = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel()
            ? FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel().toUpperCase()
            : "";
          const suffix = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_suffix").getLabel();
          CreateCustomerRequest.suffix = suffix === "Select..." || suffix === "" ? "" : suffix.toUpperCase();

          let fullName = CreateCustomerRequest.firstName ? `${CreateCustomerRequest.firstName} ` : "";
          fullName += CreateCustomerRequest.middleName ? `${CreateCustomerRequest.middleName} ` : "";
          fullName += CreateCustomerRequest.lastName ? CreateCustomerRequest.lastName : "";

          CreateCustomerRequest.fullName = fullName.toUpperCase();

          const primPhone = {};
          const primNum = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_primaryph").getLabel();
          primPhone.phone = primNum ? primNum.replace(/\W/g, "") : "";
          CreateCustomerRequest.primaryContact = primPhone;

          const altPhone = {};
          const altNum = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_alternatep").getLabel();
          altPhone.phone = altNum ? (altNum.toLowerCase() === "none" ? "" : altNum.replace(/\W/g, "")) : "";
          CreateCustomerRequest.secondaryContact = altPhone;

          const email = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_emailAddr").getLabel();
          CreateCustomerRequest.email = email || "";

          let ssnIncludedFlag = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_noSsn").getLabel() === "Yes" ? "true" : "false";
          let ssn = "0";
          if (apiUrlCall === "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER") {
            ssnIncludedFlag = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_noSsn").getLabel() === "Yes" ? "true" : "false";
            ssn = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_SSN").getLabel();
            // eslint-disable-next-line no-nested-ternary
            CreateCustomerRequest.ssn = ssnIncludedFlag === "false" ? (ssn ? ssn.replace(/\W/g, "") : "0") : "0";
          } else {
            CreateCustomerRequest.ssn = ssn;
          }
          CreateCustomerRequest.ssnNotProvidedFlag = ssnIncludedFlag;

          const driversLicense = {};
          const license = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_driverslic").getLabel();
          // eslint-disable-next-line no-nested-ternary
          driversLicense.number = license ? (license.length > 13 ? license.slice(0, 13) : license) : "";
          driversLicense.state =
            driversLicense.number !== ""
              ? FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_state").getLabel() === "[No Value]"
                ? ""
                : FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_state").getLabel()
              : "";
          let dob = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_dob").getLabel();
          dob = dob ? moment.utc(moment(dob)).format("YYYY-MM-DD") : "0001-01-01";
          driversLicense.birthday = dob;

          CreateCustomerRequest.driversLicense = driversLicense;

          if (apiUrlCall === "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER") {
            CreateCustomerRequest.customerNumber = "0";
          } else {
            CreateCustomerRequest.customerNumber = FieldDetails.getField("Contact.socoMLP$soco_customer_number").getLabel();
          }

          const comments = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_comments").getLabel();
          let memo = `${comments}, ${userLogin}, ${userPhone}`;

          // Credit Score
          if (apiUrlCall === "CUSTOM_CFG_SOCOMLP_UPDATE_CUSTOMER") {
            let creditScore = {};
            //console.log(sessionStorage.getItem("creditScore"));
            if (sessionStorage.getItem("creditScore") !== null) {
              creditScore = JSON.parse(sessionStorage.getItem("creditScore"));

              if (creditScore.creditScoreDecisionDate === null || creditScore.creditScoreDecisionDate === "") {
                //console.log("Credit Null");
                let today = new Date();
                let dd = String(today.getDate()).padStart(2, "0");
                let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
                let yyyy = today.getFullYear();
                today = yyyy + "-" + mm + "-" + dd;
                creditScore.creditScoreDecisionDate = today; // "0001-01-01";
              }

              creditScore.creditCheckRequestQuantity = "1";

              memo = `Credit assessment run, ${userLogin}, ${userPhone}`;
              sessionStorage.removeItem("creditScore");
            } else {
              const creditScoreDecision = {};
              creditScoreDecision.code = "";
              creditScore.creditScoreDecision = creditScoreDecision;

              const creditScoreExplanation = {};
              creditScoreExplanation.code = "";
              creditScore.creditScoreExplanation = creditScoreExplanation;

              creditScore.creditScoreDecisionDate = "0001-01-01";

              creditScore.creditCheckRequestQuantity = "0";
              creditScore.creditBureauComment = "";
              creditScore.creditBureauMemo = "";
            }
            CreateCustomerRequest.creditScore = creditScore;
          }
          //console.log(memo);
          CreateCustomerRequest.memo = memo.slice(0, 360);

          const otherInfo = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_otherinfo").getLabel();
          CreateCustomerRequest.otherCustomerInfo = otherInfo ? otherInfo.slice(0, 360) : "";

          Payload.BaseRequest = BaseRequest;

          if (apiUrlCall === "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER") {
            Payload.CreateCustomerRequest = CreateCustomerRequest;
          } else {
            Payload.UpdateCustomer = CreateCustomerRequest;
          }

          Request.Payload = Payload;

          const requestString = JSON.stringify(Request);

          resolve(requestString);
        });
      });
    });
  });
}

function callAddUpdateCustomerApi() {
  return new Promise((resolve, reject) => {
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceCustomerInformation", "1").then((provider) => {
      provider.getGlobalContext().then((globalContext) => {
        const profileId = globalContext.getProfileId();
        const interfaceUrl = globalContext.getInterfaceUrl();
        globalContext.getSessionToken().then((sessionToken) => {
          buildAddCustomerRequest(provider, globalContext).then((requestString) => {
            try {
              const messageObj = {};
              messageObj.api = "api";
              messageObj.messageString = requestString;
              messageObj.apiUrl = apiUrlCall; // "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER";
              messageObj.profileId = profileId; // currently logged in user profile
              messageObj.sessionToken = sessionToken; // currently logged in session token
              messageObj.interfaceUrl = interfaceUrl;

              // eslint-disable-next-line no-undef
              const worker = new Worker("../SoCoAPILibExt/worker.js");
              // eslint-disable-next-line no-undef
              const promiseWorker = new PromiseWorker(worker);

              const startTimeString = getLocalTimeStamp();
              const startTime = new Date();

              promiseWorker
                .postMessage(messageObj)
                .then((response) => {
                  const responseString = JSON.stringify(response);

                  // Set Logs
                  const endTimeString = getLocalTimeStamp();
                  const endTime = new Date();
                  const timeDiff = ((endTime - startTime) / 1000).toString();
                  // `Create new customer`, "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER"
                  logAPI(startTimeString, endTimeString, timeDiff, requestString, responseString, apiLogText, `Start Service`, apiUrlCall);
                  if (response.Result.responseCode === "000") {
                    if (apiUrlCall === "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER") {
                      resolve(response.Payload.CreateCustomerResponse.customer.customerNo);
                    } else {
                      resolve("success");
                    }
                  } else {
                    sessionStorage.setItem("ErrorMsg", "[" + response.Result.Errors[0].errorCode + "] - " + response.Result.Errors[0].errorDetails);
                    resolve("failed");
                  }
                })
                .catch(() => {
                  resolve("failed");
                });
            } catch (e) {
              resolve("failed");
            }
          });
        });
      });
    });
  });
}

function apiCall(api, workspaceRecord) {
  if (api) {
    // eslint-disable-next-line node/no-unsupported-features/es-builtins
    Promise.allSettled([api()]).then((response) => {
      // workspaceRecord.triggerNamedEvent("HideCustomerInfoLoading");
      if (response[0].status === "fulfilled" && response[0].value !== "failed") {
        workspaceRecord.updateField("socoMLP$service_order.soco_start_new_customer_number", response[0].value);
        if (apiUrlCall === "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER") {
          workspaceRecord.updateField("Contact.socoMLP$soco_customer_number", response[0].value);
        }

        document.getElementById("checkMark").classList.remove("hide");
        document.getElementById("header").classList.add("container-white");
        document.getElementById("accordion").classList.remove("up");
        workspaceRecord.triggerNamedEvent("CustInfoNext");
        workspaceRecord.triggerNamedEvent("CustInfoNextCredit");

        if (svcorderType === "Transfer Service") {
          workspaceRecord.triggerNamedEvent("CustInfoDepositNext");
        }
      } else {
        workspaceRecord.triggerNamedEvent("CustInfoFailed");
      }
    });
  } else {
    document.getElementById("checkMark").classList.remove("hide");
    document.getElementById("header").classList.add("container-white");
    document.getElementById("accordion").classList.remove("up");
    workspaceRecord.triggerNamedEvent("CustInfoNext");
    workspaceRecord.triggerNamedEvent("CustInfoNextCredit");
  }
}

function RequiredFieldsValidation(searchFields, workspaceRecord) {
  MissingFields = "";

  workspaceRecord.getFieldValues(searchFields).then((FieldDetails) => {
    if (sessionStorage.getItem("creditScore") === null) {
      if (FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel() === null || FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel() === "") {
        MissingFields += "First Name";
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Fname", "First Naame");
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Fname", "");
      }

      if (FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel() === null || FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel() === "") {
        MissingFields === "" ? (MissingFields += "Last Name") : (MissingFields += ", Last Name");
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Lname", "Last Name");
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Lname", "");
      }

      if (
        (FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_SSN").getLabel() === null || FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_SSN").getLabel() === "") &&
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_noSsn").getLabel() === "No"
      ) {
        MissingFields === "" ? (MissingFields += "SSN") : (MissingFields += ", SSN");
        workspaceRecord.triggerNamedEvent("CustInfoSSNMissing");
      }

      if (
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_primaryph").getLabel() === null ||
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_primaryph").getLabel() === ""
      ) {
        MissingFields === "" ? (MissingFields += "Primary Phone") : (MissingFields += ", Primary Phone");
        workspaceRecord.triggerNamedEvent("CustInfoPhoneMissing");
      }

      if (
        (FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_emailAddr").getLabel() === null ||
          FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_emailAddr").getLabel() === "") &&
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_noEmail").getLabel() === "No"
      ) {
        MissingFields === "" ? (MissingFields += "Email Address") : (MissingFields += ", Email Address");
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_emailAddr", "test@test");
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_emailAddr", "");
      }

      const license = FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_driverslic").getLabel();
      if (license !== null && license !== "" && FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_state").getLabel() === "[No Value]") {
        MissingFields === "" ? (MissingFields += "State") : (MissingFields += ", State");
        workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_custinfo_state", "GA");
        workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_custinfo_state", "[No Value]");
      }

      if (
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_otherinfo").getLabel() === null ||
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_otherinfo").getLabel() === ""
      ) {
        MissingFields === "" ? (MissingFields += "Other Customer Information") : (MissingFields += ", Other Customer Information");
        if (OtherInfoNullFlag === 0) {
          workspaceRecord.triggerNamedEvent("CustInfoOtherInfoMissing");
        }
      }

      if (
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_comments").getLabel() === null ||
        FieldDetails.getField("socoMLP$service_order.soco_start_custinfo_comments").getLabel() === ""
      ) {
        MissingFields === "" ? (MissingFields += "Comment") : (MissingFields += ", Comments");
        if (CommentsNullFlag === 0) {
          workspaceRecord.triggerNamedEvent("CustInfoCommentsMissing");
        }
      }

      //console.log("in");
    } else {
      //console.log("out");
    }

    if (MissingFields === "") {
      if (apiUrlCall !== "") {
        apiCall(api, workspaceRecord);
        workspaceRecord.triggerNamedEvent("CustInfoValidationSuccess");
      } else {
        workspaceRecord.triggerNamedEvent("CustInfoValidationSuccessNext");
      }
    } else {
      sessionStorage.removeItem("creditScore");
      // Disabled Validation Error Banner
      // if (MissingFields.includes(",")) {
      //   sessionStorage.setItem("ErrorMsg", MissingFields + " are Required");
      // } else {
      //   sessionStorage.setItem("ErrorMsg", MissingFields + " is Required");
      // }
      // workspaceRecord.triggerNamedEvent("CustInfoFailed");
    }
  });
}

ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceCustomerInformation", "1").then((extensionProvider) => {
  extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
    // console.log(workspaceRecord.getWorkspaceRecordId());

    workspaceRecord.addNamedEventListener("CustInfoAddBtn", () => {
      // Positive record id means the this is an existing record -- call maintain customer api
      // Negative record id means the this is a new customer -- call add customer api
      api = callAddUpdateCustomerApi; // "";
      apiUrlCall = "CUSTOM_CFG_SOCOMLP_CREATE_CUSTOMER";
      apiLogText = "Create new customer";

      RequiredFieldsValidation(searchFields, workspaceRecord);
    });

    workspaceRecord.addNamedEventListener("CustInfoUpdateBtn", () => {
      // Positive record id means the this is an existing record -- call maintain customer api
      // Negative record id means the this is a new customer -- call add customer api
      api = callAddUpdateCustomerApi;
      apiUrlCall = "CUSTOM_CFG_SOCOMLP_UPDATE_CUSTOMER";
      apiLogText = "Update customer";

      RequiredFieldsValidation(searchFields, workspaceRecord);
    });

    workspaceRecord.addNamedEventListener("CustInfoNextBtn", () => {
      apiUrlCall = "";
      apiLogText = "";
      RequiredFieldsValidation(searchFields, workspaceRecord);
    });

    workspaceRecord.addNamedEventListener("CustInfoNext", () => {
      // This is for the Next button of current panel
      document.getElementById("checkMark").classList.remove("hide");
      document.getElementById("header").classList.add("container-white");
      document.getElementById("accordion").classList.remove("up");
      const elmnt = document.getElementById("header");
      elmnt.scrollIntoView(true);
    });
    workspaceRecord.addNamedEventListener("DepositTransferNext", () => {
      // This is for the Next button of current panel
      document.getElementById("checkMark").classList.remove("hide");
      document.getElementById("header").classList.add("container-white");
      document.getElementById("accordion").classList.remove("up");
      const elmnt = document.getElementById("header");
      elmnt.scrollIntoView(true);
    });

    workspaceRecord.addNamedEventListener("StartServiceCommentsNotNull", () => {
      CommentsNullFlag = 1;
    });

    workspaceRecord.addNamedEventListener("StartServiceOtherInfoNotNull", () => {
      OtherInfoNullFlag = 1;
    });

    workspaceRecord.addNamedEventListener("StartCustInfoSSNNull", () => {
      // This is for SSN checkbox
      const novalue = "";
      workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_SSN", novalue);
    });

    workspaceRecord.addNamedEventListener("CreditCheckPrevious", () => {
      // This is for the Previous button of next panel
      document.getElementById("accordion").classList.add("up");
      document.getElementById("header").classList.remove("container-white");
      document.getElementById("checkMark").classList.add("hide");
      workspaceRecord.triggerNamedEvent("ShowStartCustInfoHeader"); // This is for changing the panel to blue

      const elmnt = document.getElementById("header");
      elmnt.scrollIntoView(true);
    });
    workspaceRecord.addNamedEventListener("StartServiceDefaultLoad", () => {
      // This is for the Default Load of Start Service
      document.getElementById("checkMark").classList.add("hide");
      document.getElementById("header").classList.add("container-white");
      document.getElementById("accordion").classList.remove("up");
    });
    workspaceRecord.addNamedEventListener("CustInfoPrevious", () => {
      // This is for the previous button of current panel
      document.getElementById("checkMark").classList.add("hide");
      document.getElementById("header").classList.add("container-white");
      document.getElementById("accordion").classList.remove("up");
    });
    workspaceRecord.addNamedEventListener("PremiseNext", () => {
      // This is for the Next button from previous panel
      document.getElementById("checkMark").classList.add("hide");
      document.getElementById("header").classList.remove("container-white");
      document.getElementById("accordion").classList.add("up");
    });
    workspaceRecord.addNamedEventListener("ExpandPanelHeader", () => {
      // This is for the Expand All
      document.getElementById("accordion").classList.add("up");
      document.getElementById("header").classList.remove("container-white");
      document.getElementById("checkMark").classList.add("hide");
      workspaceRecord.triggerNamedEvent("ShowStartCustInfoHeader"); // This is for changing the panel to blue
    });
    // workspaceRecord.addNamedEventListener("StartServiceSSNFound", () => {
    //   // This is for when Validating SSN
    //   extensionProvider.registerUserInterfaceExtension((IUserInterfaceContext) => {
    //     IUserInterfaceContext.getModalWindowContext().then((IModalWindowContext) => {
    //       const modalWindow = IModalWindowContext.createModalWindow();
    //       modalWindow.setTitle("Validate SSN/TIN");
    //       modalWindow.setContentUrl("../StartServiceCustomerInformation/ssn-modal.html");
    //       modalWindow.setHeight("175px");
    //       modalWindow.setWidth("700px");
    //       modalWindow.render();
    //     });
    //   });
    // });
    workspaceRecord.addFieldValueListener("socoMLP$service_order.soco_start_custinfo_emailAddr", () => {
      workspaceRecord.getFieldValues(["socoMLP$service_order.soco_start_custinfo_emailAddr"]).then((IFieldDetails) => {
        const email = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_emailAddr").getLabel();
        workspaceRecord.updateField("socoMLP$service_order.soco_start_lease_emailAddr", email);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_paperless_emailAddr", email);
      });
    });
  });
});

document.querySelector("#accordion").addEventListener("click", (e) => {
  if (e.target.classList.contains("up")) {
    e.target.classList.remove("up");
    document.getElementById("header").classList.add("container-white");
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceCustomerInformation", "1").then((extensionProvider) => {
      extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
        workspaceRecord.triggerNamedEvent("HideStartCustInfoHeader"); // Thsi is to make panel white
      });
    });
  } else {
    e.target.classList.add("up");
    document.getElementById("header").classList.remove("container-white");
    document.getElementById("checkMark").classList.add("hide");
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceCustomerInformation", "1").then((extensionProvider) => {
      extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
        workspaceRecord.triggerNamedEvent("ShowStartCustInfoHeader"); // Thsi is to make panel blue
      });
    });
  }
});

ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceCustomerInformation", "1").then((extensionProvider) => {
  extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
    workspaceRecord.addNamedEventListener("StartServiceCustInfoCopy", () => {
      const copyFieldNames = [
        "socoMLP$service_order.soco_start_custinfo_title",
        "socoMLP$service_order.soco_start_custinfo_Fname",
        "socoMLP$service_order.soco_start_custinfo_Mname",
        "socoMLP$service_order.soco_start_custinfo_Lname",
        "socoMLP$service_order.soco_start_custinfo_suffix",
      ];

      workspaceRecord.getFieldValues(copyFieldNames).then((IFieldCopyDetails) => {
        const title = IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_title").getLabel()
          ? IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_title").getLabel()
          : "";
        const firstNameCopy = IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel()
          ? IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel()
          : "";
        const middleNameCopy = IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_Mname").getLabel()
          ? IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_Mname").getLabel()
          : "";
        const lastNameCopy = IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel()
          ? IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel()
          : "";
        const suffix = IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_suffix").getLabel()
          ? IFieldCopyDetails.getField("socoMLP$service_order.soco_start_custinfo_suffix").getLabel()
          : "";

        let inputValue = title !== "Select..." ? `${title} ` : "";
        inputValue += firstNameCopy ? `${firstNameCopy} ` : "";
        inputValue += middleNameCopy ? `${middleNameCopy} ` : "";
        inputValue += lastNameCopy ? `${lastNameCopy} ` : "";
        inputValue += suffix !== "Select..." ? `${suffix}` : "";
        inputValue = inputValue.trim();
        const inputElement = document.createElement("input");
        inputElement.setAttribute("value", inputValue);
        document.body.appendChild(inputElement);
        inputElement.select();
        document.execCommand("copy");
        inputElement.parentNode.removeChild(inputElement);
      });
    });
  });
});

function SetDefaultValues() {
  ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceCustomerInformation", "1").then((extensionProvider) => {
    extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
      if (sessionStorage.getItem("start_service_modal_customer_number")) {
        const customerNo = sessionStorage.getItem("start_service_modal_customer_number");
        sessionStorage.removeItem("start_service_modal_customer_number");
        workspaceRecord.updateField("Contact.socoMLP$soco_customer_number", customerNo);
        workspaceRecord.triggerNamedEvent("StartSvcCustomerNumberExisting");
        let prefix = "";
        let suffix = "";
        let fname = "";
        let mname = "";
        let lname = "";
        // let ssn = "";
        let email = "";
        // let primPhone = "";
        // let altPhone = "";
        let dob = "";
        let ssnProvided = "";
        let driversLicense = "";
        let driversLicenseState = "";
        let otherInfo = "";
        let decisionCode = "";
        let decisionDate = "";

        // if SSN Search; else Name/Phone search
        if (sessionStorage.getItem("shell_ssn_nongpc_details")) {
          const customerInfo = JSON.parse(sessionStorage.getItem("shell_ssn_nongpc_details"));
          sessionStorage.removeItem("shell_ssn_nongpc_details");
          prefix = customerInfo.GetCustomer.prefix;
          suffix = customerInfo.GetCustomer.suffix;
          fname = customerInfo.GetCustomer.firstName;
          mname = customerInfo.GetCustomer.middleName;
          lname = customerInfo.GetCustomer.lastName;
          // ssn = customerInfo.GetCustomer.ssn;
          email = customerInfo.GetCustomer.email;
          // primPhone = customerInfo.GetCustomer.primaryContact.phone;
          // altPhone = customerInfo.GetCustomer.secondaryContact.phone;
          dob = customerInfo.GetCustomer.driversLicense.birthday;
          ssnProvided = customerInfo.GetCustomer.ssnNotProvidedFlag === "true" ? "Yes" : "No";
          driversLicense = customerInfo.GetCustomer.driversLicense.number;
          driversLicenseState = customerInfo.GetCustomer.driversLicense.state;

          if (sessionStorage.getItem("shell_namephone_nongpc_details")) {
            const otherInfoObj = JSON.parse(sessionStorage.getItem("shell_namephone_nongpc_details"));
            sessionStorage.removeItem("shell_namephone_nongpc_details");
            otherInfo = otherInfoObj.Payload.OtherCustomerInfo.otherCustomerInfo;
            decisionCode = getCreditDecision(otherInfoObj.Payload.OtherCustomerInfo.creditScore);
            const date = otherInfoObj.Payload.OtherCustomerInfo.creditScoreDecisionDate ? otherInfoObj.Payload.OtherCustomerInfo.creditScoreDecisionDate : "";
            if (date) {
              const dateArr = date.split("-");
              decisionDate = `${dateArr[1]}/${dateArr[2]}/${dateArr[0]}`;
            }
          }
        } else {
          const customerInfo = JSON.parse(sessionStorage.getItem("shell_namephone_nongpc_details"));
          sessionStorage.removeItem("shell_namephone_nongpc_details");
          prefix = customerInfo.Payload.OtherCustomerInfo.title;
          suffix = customerInfo.Payload.OtherCustomerInfo.suffix;
          fname = customerInfo.Payload.OtherCustomerInfo.firstName;
          mname = customerInfo.Payload.OtherCustomerInfo.middleName;
          lname = customerInfo.Payload.OtherCustomerInfo.lastName;
          // ssn = customerInfo.Payload.OtherCustomerInfo.ssn;
          email = customerInfo.Payload.OtherCustomerInfo.email;
          // primPhone = customerInfo.Payload.OtherCustomerInfo.primaryPhone;
          // altPhone = customerInfo.Payload.OtherCustomerInfo.altPhone;
          dob = customerInfo.Payload.OtherCustomerInfo.driversLicense.birthday;
          ssnProvided = customerInfo.Payload.OtherCustomerInfo.ssnNotProvidedFlag === "true" ? "Yes" : "No";
          driversLicense = customerInfo.Payload.OtherCustomerInfo.driversLicense.driversLicenseNo;
          driversLicenseState = customerInfo.Payload.OtherCustomerInfo.driversLicense.state;
          otherInfo = customerInfo.Payload.OtherCustomerInfo.otherCustomerInfo;
          decisionCode = getCreditDecision(customerInfo.Payload.OtherCustomerInfo.creditScore);
          const date = customerInfo.Payload.OtherCustomerInfo.creditScoreDecisionDate ? customerInfo.Payload.OtherCustomerInfo.creditScoreDecisionDate : "";
          if (date) {
            const dateArr = date.split("-");
            decisionDate = `${dateArr[1]}/${dateArr[2]}/${dateArr[0]}`;
          }
        }

        workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_custinfo_title", prefix);
        workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_custinfo_suffix", suffix);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Fname", fname);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Lname", lname);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Mname", mname);
        // workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_SSN", ssn);
        // workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_primaryph", primPhone);
        // workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_alternatep", altPhone);
        let dobDateArr = "";
        let dobDate = "";
        if (!(dob === "0001-01-01" || dob === "")) {
          dobDateArr = dob.split("-");
          dobDate = dobDateArr.length > 0 ? new Date(`${dobDateArr[1]}/${dobDateArr[2]}/${dobDateArr[0]}`) : "";
        }

        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_noSsn", ssnProvided);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_dob", dobDate);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_emailAddr", email);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_lease_emailAddr", email);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_paperless_emailAddr", email);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_otherinfo", otherInfo);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_driverslic", driversLicense);
        workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_custinfo_state", driversLicenseState);

        // Credit Decision
        workspaceRecord.updateField("socoMLP$service_order.soco_start_credit_outcome", decisionCode);
        workspaceRecord.updateField("socoMLP$service_order.soco_start_credit_date", decisionDate);

        // set name fields to read only
        workspaceRecord.setFieldReadOnly("socoMLP$service_order.soco_start_custinfo_noSsn");
        workspaceRecord.setFieldReadOnly("socoMLP$service_order.soco_start_custinfo_title");
        workspaceRecord.setFieldReadOnly("socoMLP$service_order.soco_start_custinfo_suffix");
        workspaceRecord.setFieldReadOnly("socoMLP$service_order.soco_start_custinfo_Fname");
        workspaceRecord.setFieldReadOnly("socoMLP$service_order.soco_start_custinfo_Lname");
        workspaceRecord.setFieldReadOnly("socoMLP$service_order.soco_start_custinfo_Mname");
      } else {
        const searchFields = [
          "Contact.name.first",
          "Contact.name.last",
          "Contact.socoMLP$Middle_Name",
          "Contact.socoMLP$soco_ssn",
          "Contact.socoMLP$soco_primary_phone",
          "Contact.socoMLP$soco_alternate_phone",
          "Contact.socoMLP$soco_email_address",
          "Contact.socoMLP$soco_date_of_birth",
          "Contact.socoMLP$soco_other_customer_info",
          "Contact.socoMLP$soco_drivers_license",
          "Contact.C$acct_num",
          "socoMLP$address.soco_svcaddressline1",
          "socoMLP$address.soco_svcaddressline2",
          "socoMLP$address.soco_svccity",
          "socoMLP$address.soco_svcstate",
          "socoMLP$address.soco_svczip",
          "soco_start_custinfo_comments",
        ];
        workspaceRecord.getFieldValues(searchFields).then((IFieldDetails) => {
          const accountNum = IFieldDetails.getField("Contact.C$acct_num").getLabel();

          // if account number is not empty, then this is an existing account
          // default the fields in start service
          if (accountNum !== "" && accountNum !== undefined && accountNum !== null) {
            const fname = IFieldDetails.getField("Contact.name.first").getLabel();
            const lname = IFieldDetails.getField("Contact.name.last").getLabel();
            const mname = IFieldDetails.getField("Contact.socoMLP$Middle_Name").getLabel();
            // const ssn = IFieldDetails.getField("Contact.socoMLP$soco_ssn").getLabel();
            const primPhone = IFieldDetails.getField("Contact.socoMLP$soco_primary_phone").getLabel();
            const altPhone = IFieldDetails.getField("Contact.socoMLP$soco_alternate_phone").getLabel();
            let email = IFieldDetails.getField("Contact.socoMLP$soco_email_address").getLabel();
            email = email === "None" ? "" : email;
            const dob = IFieldDetails.getField("Contact.socoMLP$soco_date_of_birth").getLabel();
            const dobDate = new Date(dob);
            const otherInfo = IFieldDetails.getField("Contact.socoMLP$soco_other_customer_info").getLabel();
            const driversLicense = IFieldDetails.getField("Contact.socoMLP$soco_drivers_license").getLabel();

            // address fields
            // const addressLine1 = IFieldDetails.getField("socoMLP$address.soco_svcaddressline1").getLabel();
            // const streetNum = addressLine1.match(/\d+/)[0];
            // const streeName = addressLine1.replace(streetNum, "").trim();
            // const city = IFieldDetails.getField("socoMLP$address.soco_svccity").getLabel();
            // const state = IFieldDetails.getField("socoMLP$address.soco_svcstate").getLabel();
            // const zip = IFieldDetails.getField("socoMLP$address.soco_svczip").getLabel();

            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Fname", fname);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Lname", lname);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Mname", mname);
            // workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_SSN", ssn);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_primaryph", primPhone);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_alternatep", altPhone);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_dob", dobDate);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_emailAddr", email);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_lease_emailAddr", email);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_paperless_emailAddr", email);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_otherinfo", otherInfo);
            workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_driverslic", driversLicense);
            const acct = accountNum.replace(/\W/g, "");
            const state = sessionStorage.getItem(`drivers_license_state_${acct}`) ? sessionStorage.getItem(`drivers_license_state_${acct}`) : "";
            workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_custinfo_state", state);

            // // set address fields
            // workspaceRecord.updateField("socoMLP$service_order.soco_start_credit_streetnum", streetNum);
            // workspaceRecord.updateField("socoMLP$service_order.soco_start_credit_streetname", streeName);
            // workspaceRecord.updateField("socoMLP$service_order.soco_start_credit_city", city);
            // workspaceRecord.updateFieldByLabel("socoMLP$service_order.soco_start_credit_state", state);
            // workspaceRecord.updateField("socoMLP$service_order.soco_start_credit_zipcode", zip);

            // Check if email is valid and show "send email" button if it is
            const emailrgx = /^[^\s@]+@[^\s@]+[.][^\s@]+$/;
            if (email && emailrgx.test(email)) {
              workspaceRecord.triggerNamedEvent("StartSvcLeaseEmailIsValid");
            }
          } else {
            const searchFirstName = sessionStorage.getItem("searchFirstName");
            const searchMiddleName = sessionStorage.getItem("searchMiddleName");
            const searchLastName = sessionStorage.getItem("searchLastName");
            const searchPhone = sessionStorage.getItem("searchPhone");
            // const searchSSN = sessionStorage.getItem("searchSSN");

            sessionStorage.removeItem("searchFirstName");
            sessionStorage.removeItem("searchMiddleName");
            sessionStorage.removeItem("searchLastName");
            sessionStorage.removeItem("searchPhone");
            // sessionStorage.removeItem("searchSSN");

            if (!(searchFirstName === "null")) {
              workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Fname", searchFirstName);
            }
            if (!(searchLastName === "null")) {
              workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Lname", searchLastName);
            }
            if (!(searchMiddleName === "null")) {
              workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_Mname", searchMiddleName);
            }
            // if (!(searchSSN === "null")) {
            //   workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_SSN", searchSSN);
            // }
            if (!(searchPhone === "null")) {
              workspaceRecord.updateField("socoMLP$service_order.soco_start_custinfo_primaryph", searchPhone);
            }

            // if (searchSSN !== null && searchSSN !== undefined && searchSSN !== "") {
            //   workspaceRecord.triggerNamedEvent("DisableSSNValidate");
            // } else {
            //   workspaceRecord.triggerNamedEvent("EnableSSNValidate");
            // }
          }
        });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", SetDefaultValues);
