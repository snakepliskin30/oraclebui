/* eslint-disable node/no-unsupported-features/es-builtins */
/* eslint-disable no-unused-vars */
let userId = "";
let userLogin = "";
let userPhone = "";
let selectedPremiseNo = "";
let profileId = "";
let sessionToken = "";
let interfaceUrl = "";
let newAccountNumber = "";
let errorMessage = "";
let successMessage = "";
let selectedAddr = "";
let transactionType = "";

function formatDate(date) {
  let d = new Date(date);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  let year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

function callObligationApi(completedObligationsArr) {
  return new Promise((resolve, reject) => {
    ORACLE_SERVICE_CLOUD.extension_loader.load("SoCoAPILibExt", "1").then((extensionProvider) => {
      extensionProvider.getGlobalContext().then((globalContext) => {
        globalContext.getSessionToken().then((token) => {
          extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
            workspaceRecord.getFieldValues(["socoMLP$service_order.soco_start_selected_premise"]).then((IFieldDetails) => {
              selectedPremiseNo = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_premise").getLabel();
              const recordId = workspaceRecord.getWorkspaceRecordId();
              const profileIdValue = globalContext.getProfileId();
              const interfaceUrlValue = globalContext.getInterfaceUrl();

              // const ObligationSel = sessionStorage.getItem(`completed_obligations_${selectedPremiseNo}`);
              const ObligationSel = completedObligationsArr;

              const Request = {};
              const Payload = {};
              const MaintainObligation = {};
              const testarray = ObligationSel; // JSON.parse(ObligationSel);

              testarray.forEach((obj) => {
                obj.obligationsOverrideFlag = obj.obligationOverrideFlag;
                obj.completeDate = obj.completionDate;

                let rem = obj.Remarks.description + " " + obj.osvcComments;

                if (rem.length > 360) {
                  rem = rem.substring(0, 359);
                }

                obj.Remarks.description = rem;

                delete obj.osvcComments;
                delete obj.obligationOverrideFlag;
                delete obj.completionDate;
                delete obj.HoldReasonCode;
                delete obj.RemarksDescription;
                delete obj.dateFormatted;
                let objIndex = testarray.findIndex((obj2) => obj2.obligationCompleteFlag === "false" && obj2.completeDate);
                try {
                  testarray[objIndex].obligationCompleteFlag = "true";
                  testarray[objIndex].completeDate = formatDate(new Date());
                } catch (e) {
                  objIndex = testarray.findIndex((obj3) => obj3.obligationCompleteFlag && obj3.completeDate);
                  testarray[objIndex].obligationCompleteFlag = "true";
                  testarray[objIndex].completeDate = formatDate(new Date());
                }
              });

              const Obligations = testarray;
              // CreateObligation Req
              MaintainObligation.transactionId = getCurrentTimestamp();
              MaintainObligation.userId = userId;
              MaintainObligation.method = "Update";
              MaintainObligation.premiseNumber = selectedPremiseNo;
              MaintainObligation.Obligations = Obligations;

              Payload.MaintainObligation = MaintainObligation;
              Request.Payload = Payload;
              const requestString = JSON.stringify(Request);

              try {
                const messageObj = {};

                messageObj.api = "api";
                messageObj.messageString = requestString;
                messageObj.apiUrl = "CUSTOM_CFG_COMPLETE_OBLIGATION_API_URL";
                messageObj.profileId = profileIdValue; // currently logged in user profile
                messageObj.sessionToken = token; // currently logged in session token
                messageObj.interfaceUrl = interfaceUrlValue;

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
                    sessionStorage.setItem(`completeObligationResponse_${selectedPremiseNo}`, responseString);

                    // Set Logs
                    const endTimeString = getLocalTimeStamp();
                    const endTime = new Date();
                    const timeDiff = ((endTime - startTime) / 1000).toString();
                    // eslint-disable-next-line no-undef
                    logAPI(startTimeString, endTimeString, timeDiff, requestString, responseString, selectedPremiseNo, `Complete Obligation`, "CUSTOM_CFG_COMPLETE_OBLIGATION_API_URL");

                    // call usage log
                    try {
                      if (response.Result.responseCode === "000") {
                        // triggerStopServiceResultNamedEvent(true);
                        // eslint-disable-next-line no-undef
                        usageMetricsLogMain("Complete Obligation", "Success", selectedPremiseNo);
                        resolve("success");
                      } else {
                        let errordesc = "";
                        try {
                          errordesc = response.Result.errors[0].errorMessage;
                        } catch (e) {
                          errordesc = "no error description";
                        }
                        // eslint-disable-next-line no-undef
                        usageMetricsLogMain("Complete Obligation", `Failure: ${errordesc}`, selectedPremiseNo);
                        resolve("failed");
                      }
                    } catch (e) {
                      // triggerStopServiceResultNamedEvent(false);
                      // eslint-disable-next-line no-undef
                      usageMetricsLogMain("Complete Obligation", `Failure`, selectedPremiseNo);
                      resolve("failed");
                    }
                  })
                  .catch((e) => {
                    sessionStorage.setItem(`completeObligationResponse_${selectedPremiseNo}`, JSON.stringify({ Result: { status: "FAILED" } }));
                    // triggerStopServiceResultNamedEvent(false);
                    resolve("failed");
                  });
              } catch (e) {
                /* handle error */
                sessionStorage.setItem(`completeObligationResponse_${selectedPremiseNo}`, JSON.stringify({ Result: { status: "FAILED" } }));
                // triggerStopServiceResultNamedEvent(false);
                resolve("failed");
              }
            });
          });
        });
      });
    });
  });
}

function buildStartServiceRequest() {
  return new Promise((resolve, reject) => {
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceFinalItems", "1").then((extensionProvider) => {
      extensionProvider.getGlobalContext().then((globalContext) => {
        profileId = globalContext.getProfileId();
        interfaceUrl = globalContext.getInterfaceUrl();
        globalContext.getSessionToken().then((session) => {
          sessionToken = session;
          extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
            const Request = {};
            const Header = {};
            const Payload = {};
            const startService = {};
            const account = {};
            const mailingAddress = {};
            const deposit = {};
            const unpaidAccounts = [];
            const connectionOrderFlags = {};

            Header.verb = "post";
            Header.noun = "connectService";
            Header.revision = "1.4";
            Header.userId = "EU_OSC";
            Header.organization = "SOCO";
            Header.transactionId = getCurrentTimestamp();

            const searchFields = [
              "Contact.c$acct_num",
              "socoMLP$service_order.soco_start_selected_premise",
              "socoMLP$service_order.soco_start_custinfo_Fname",
              "socoMLP$service_order.soco_start_custinfo_Mname",
              "socoMLP$service_order.soco_start_custinfo_Lname",
              "socoMLP$service_order.soco_start_custinfo_primaryph",
              "socoMLP$service_order.soco_start_custinfo_alternatep",
              "socoMLP$service_order.soco_start_custinfo_emailAddr",
              "socoMLP$service_order.soco_start_addressline1",
              "socoMLP$service_order.soco_start_addressline2",
              "socoMLP$service_order.soco_start_city",
              "socoMLP$service_order.soco_start_state",
              "socoMLP$service_order.soco_start_zipCode",
              "socoMLP$service_order.soco_deposit_action",
              "socoMLP$service_order.soco_start_selected_line1",
              "socoMLP$service_order.soco_start_selected_line2",
              "socoMLP$service_order.soco_start_selected_city",
              "socoMLP$service_order.soco_start_selected_state",
              "socoMLP$service_order.soco_start_selected_zipCode",
              "socoMLP$service_order.soco_start_deposit_action",
              "socoMLP$service_order.soco_start_deposit_amt",
              "socoMLP$service_order.soco_start_custinfo_SSN",
              "socoMLP$service_order.soco_start_date_wanted",
              "socoMLP$service_order.soco_start_paperless_action",
              "socoMLP$service_order.soco_start_paperless_reminder",
              "socoMLP$service_order.soco_start_paperless_daysdue",
              "socoMLP$service_order.soco_start_lease_leaseHold",
              "socoMLP$service_order.soco_start_val_email_flag",
              "socoMLP$service_order.soco_start_lease_incomingPhone",
              "socoMLP$service_order.soco_start_lease_callbackNum",
              "socoMLP$service_order.soco_start_lease_reasonVer",
              "socoMLP$service_order.soco_start_rate_Rate_Options",
              "socoMLP$service_order.soco_start_rate_RateOptions",
              "Contact.socoMLP$soco_customer_number",
              "socoMLP$service_order.soco_start_credit_outcome",
              "socoMLP$service_order.soco_transfer_seniordiscount",
              "socoMLP$service_order.soco_start_deposit_depositHold",
              "socoMLP$service_order.soco_Transfer_BudgetBilling",
              "socoMLP$service_order.soco_start_selected_premise",
            ];

            transactionType = ""; // this is for usage metrics logging

            workspaceRecord.getFieldValues(searchFields).then(async (IFieldDetails) => {
              selectedPremiseNo = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_premise").getLabel();
              startService.userId = userId;

              const dateWanted = IFieldDetails.getField("socoMLP$service_order.soco_start_date_wanted").getLabel();
              let dateWantedFormatted = "";
              let connEffDate = "";
              console.log("date wanted", dateWanted);
              if (dateWanted) {
                const dateWantedISO = getFormattedDateFromField(dateWanted.toString());
                const dateTest = moment.utc(moment(dateWanted)).format("YYYY-MM-DD");
                const dateTestFormat = moment.utc(moment(dateWanted)).format("MM/DD/YYYY");
                // const dateWantedObj = new Date(dateWantedISO);
                // const dateWantedWithTzOffset = new Date(dateWantedObj.getTime() + Math.abs(dateWantedObj.getTimezoneOffset() * 60000));
                // const dateWantedMonth = (dateWantedWithTzOffset.getMonth() + 1).toString().padStart(2, "0");
                // const dateWantedDay = dateWantedWithTzOffset.getDate().toString().padStart(2, "0");
                // const dateWantedYear = dateWantedWithTzOffset.getFullYear();

                const dateWantedArr = dateWantedISO.split("-");

                dateWantedFormatted = dateTestFormat;
                connEffDate = dateTest;
              } else {
                dateWantedFormatted = "";
                connEffDate = "";
              }
              startService.connectionEffectiveDate = connEffDate;

              // Account Details
              account.firstName = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel();
              account.middleInitial = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Mname").getLabel();
              account.lastName = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel();

              const primPhone = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_primaryph").getLabel();
              account.primaryContactPhone = primPhone ? primPhone.replace(/\W/g, "") : "";

              let altPhone = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_alternatep").getLabel();

              if (altPhone && altPhone.toLowerCase() === "none") {
                altPhone = "";
              }

              account.secondaryContactPhone = altPhone ? altPhone.replace(/\W/g, "") : "";

              account.email = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_emailAddr").getLabel();

              let fullName = "";
              fullName += account.firstName ? `${account.firstName} ` : "";
              fullName += account.middleInitial ? `${account.middleInitial} ` : "";
              fullName += account.lastName ? `${account.lastName}` : "";

              const last4SSN = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_SSN").getLabel().slice(-4);

              mailingAddress.addressLine1 = IFieldDetails.getField("socoMLP$service_order.soco_start_addressline1").getLabel();
              mailingAddress.addressLine2 = IFieldDetails.getField("socoMLP$service_order.soco_start_addressline2").getLabel();
              mailingAddress.city = IFieldDetails.getField("socoMLP$service_order.soco_start_city").getLabel();
              mailingAddress.state = IFieldDetails.getField("socoMLP$service_order.soco_start_state").getLabel();
              mailingAddress.zip = IFieldDetails.getField("socoMLP$service_order.soco_start_zipCode").getLabel();

              account.mailingAddress = mailingAddress;
              startService.account = account;

              const selectedAddr1 = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line1").getLabel()
                ? IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line1").getLabel()
                : "";
              const selectedAddr2 = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line2").getLabel()
                ? IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line2").getLabel()
                : "";
              const selectedCity = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_city").getLabel();
              const selectedState = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_state").getLabel();
              const selectedZip = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_zipCode").getLabel();

              selectedAddr = selectedAddr1 ? `${selectedAddr1.trim()} ` : "";
              selectedAddr += selectedAddr2 ? `${selectedAddr2.trim()} ` : "";
              selectedAddr += selectedCity ? `${selectedCity} ` : "";
              selectedAddr += selectedState ? `${selectedState} ` : "";
              selectedAddr += selectedZip ? `${selectedZip}` : "";
              selectedAddr = selectedAddr.trim();

              startService.addressCompressed = selectedAddr;

              // Get Account Details
              let acctNo = IFieldDetails.getField("Contact.c$acct_num").getLabel();
              let acctNoFormatted = "";

              // This is an existing cutomer
              let customerNo = "";
              let companyCode = "";
              if (acctNo !== null && acctNo !== undefined && acctNo !== "") {
                acctNo = acctNo.replace(/\W/g, "");
                const ApiResponseInfo = await globalContext.invokeAction("getAccountInfo", acctNo);
                const AcctInfo = ApiResponseInfo.result.find((i) => i != null);
                companyCode = AcctInfo.customerInfo.Payload.CustomerInfo.operatingCompany === "GPC" ? "2" : "5";
                customerNo = AcctInfo.customerInfo.Payload.CustomerInfo.customerNo;

                acctNoFormatted = acctNo.padStart(10, "0");
                acctNoFormatted = `${acctNoFormatted.slice(0, 5)}-${acctNoFormatted.slice(-5)}`;
                transactionType = "Start Service Existing";
              } else {
                /* set for new customers */
                acctNo = "";
                companyCode = "2";
                customerNo = IFieldDetails.getField("Contact.socoMLP$soco_customer_number").getLabel();
                transactionType = "Start Service New";
              }

              startService.customerNo = customerNo;
              startService.companyCode = companyCode;
              startService.premiseNo = selectedPremiseNo;
              sessionStorage.setItem("selected_premise_start", selectedPremiseNo);

              // Get meter details
              let meterDetails = sessionStorage.getItem(`premise_details_${selectedPremiseNo}`);
              sessionStorage.removeItem(`premise_details_${selectedPremiseNo}`);

              const servicePoint = {};
              const meters = {};

              const rateOptionsField = IFieldDetails.getField("socoMLP$service_order.soco_start_rate_RateOptions").getLabel();
              const rateOptionSelected = rateOptionsField || IFieldDetails.getField("socoMLP$service_order.soco_start_rate_Rate_Options").getLabel();
              let tariffScheduleCode = "";
              switch (rateOptionSelected) {
                case "FlatBill First Year":
                  tariffScheduleCode = "091";
                  break;
                case "Residential":
                  tariffScheduleCode = "025";
                  break;
                case "Smart Usage":
                  tariffScheduleCode = "136";
                  break;
                default:
                  break;
              }
              // Selecting a premise was made
              if (meterDetails !== "null" && meterDetails !== null) {
                meterDetails = JSON.parse(meterDetails);
                servicePoint.servicePointNumber = meterDetails.Payload.PendingOrdersAndObligations.getPremise[0].servicePoint[0].servicePointNumber;

                meters.meterNo = meterDetails.Payload.PendingOrdersAndObligations.getPremise[0].servicePoint[0].meters[0].meterNo;
                meters.meterPointLocationCode = meterDetails.Payload.PendingOrdersAndObligations.getPremise[0].servicePoint[0].meters[0].meterPointLocationCode;
              } else {
                servicePoint.servicePointNumber = "";

                meters.meterNo = "";
                meters.meterPointLocationCode = "";
              }

              servicePoint.meters = meters;
              startService.servicePoint = servicePoint;

              // Get Deposit Details
              let depositActionCode = "";
              let depositActionPhrase = "";
              let depositAmt = "";
              let depositComment = "";
              const decisionCode = IFieldDetails.getField("socoMLP$service_order.soco_start_credit_outcome").getLabel();
              const depositAction = IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_action").getLabel();
              switch (depositAction) {
                case "Quote Deposit":
                  depositActionCode = "5";
                  depositAmt = parseFloat(
                    IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_amt")
                      .getLabel()
                      .replace(/[^\d.-]/g, "")
                  );
                  depositComment = `${fullName}, ${last4SSN}, ${decisionCode}, $${depositAmt}, ${userLogin}, ${userPhone}`;
                  depositActionPhrase = `$${depositAmt}`;
                  break;
                case "Waive Deposit":
                  depositActionCode = "1";
                  depositActionPhrase = "No Deposit";
                  depositAmt = "0";
                  break;
                case "Transfer Deposit":
                  depositActionCode = "4";
                  depositAmt = parseFloat(
                    IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_amt")
                      .getLabel()
                      .replace(/[^\d.-]/g, "")
                  );
                  break;
                default:
                  depositAmt = "0";
                  break;
              }
              deposit.depositActionCode = depositActionCode;
              deposit.depositComment = depositComment.slice(0, 360);
              deposit.depositAmount = depositAmt;

              startService.deposit = deposit;
              const unpaidAcct = {};
              // let unpaidAmountTotal = "";
              let i = "";
              try {
                const array_data = JSON.parse(sessionStorage.getItem(`unpaidBills_${acctNo}`));
                if (array_data != null && array_data.length > 0) {
                  for (i in array_data) {
                    // unpaidAmountTotal = unpaidAmountTotal + array_data[i][0] + ", " + array_data[i][1] + ",";
                    let unpaidBillAcct = array_data[i][0].replace("-", "");
                    unpaidBillAcct = unpaidBillAcct.padStart(10, "0");
                    unpaidBillAcct = `${unpaidBillAcct.slice(0, 5)}-${unpaidBillAcct.slice(-5)}`;
                    let comment = `${fullName}, ${last4SSN}, ${unpaidBillAcct}, ${array_data[i][1]}, ${userLogin}, ${userPhone}`;
                    unpaidAccounts.push({
                      accountNo: array_data[i][0].replace("-", ""),
                      unpaidAmount: array_data[i][1].replace("$", ""),
                      unpaidBillComment: comment.slice(0, 360),
                    });
                  }
                } else {
                  unpaidAcct.accountNo = "";
                  unpaidAcct.unpaidAmount = "";
                  unpaidAcct.unpaidBillComment = "";
                  unpaidAccounts.push(unpaidAcct);
                }
              } catch {
                unpaidAcct.accountNo = "";
                unpaidAcct.unpaidAmount = "";
                unpaidAcct.unpaidBillComment = "";
                unpaidAccounts.push(unpaidAcct);
              }
              // Get Unpaid Accounts

              startService.unpaidAccounts = unpaidAccounts;

              // try {
              //   if (unpaidAccounts != null && unpaidAccounts.length > 0) {
              //     startService.unpaidBillComment = `${fullName}, ${last4SSN}, ${unpaidAmountTotal} ${userLogin}, ${userPhone}`;
              //   } else {
              //     startService.unpaidBillComment = "";
              //   }
              // } catch {
              //   startService.unpaidBillComment = "";
              // }

              // Connection Order Flags
              const connFlag = {};
              const paperlessAction = IFieldDetails.getField("socoMLP$service_order.soco_start_paperless_action").getLabel();

              let paperlessActionCode = "";
              switch (paperlessAction) {
                case "Enroll in Paperless":
                  paperlessActionCode = "01";
                  break;
                case "Send Paperless Info":
                  paperlessActionCode = "04";
                  break;
                case "Not Interested in Paperless":
                  paperlessActionCode = "05";
                  break;
                default:
                  break;
              }

              const leaseObligationCode = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_leaseHold").getLabel().toLowerCase() === "yes" ? "Y" : "N";
              const reminderFlag = IFieldDetails.getField("socoMLP$service_order.soco_start_paperless_reminder").getLabel().toLowerCase() === "yes";
              const reminderDays = IFieldDetails.getField("socoMLP$service_order.soco_start_paperless_daysdue").getLabel();
              const validateEmailFlag = IFieldDetails.getField("socoMLP$service_order.soco_start_val_email_flag").getLabel();
              const incomingNum = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_incomingPhone").getLabel();
              const callbackNum = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_callbackNum").getLabel();
              const reasonVer = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_reasonVer").getLabel();
              const leaseComment = `${fullName}, ${last4SSN}, ${acctNoFormatted}, ${selectedAddr}, ${incomingNum}, ${callbackNum}, ${reasonVer}, ${userLogin}, ${userPhone}`;

              connFlag.paperlessIndicatorCode = paperlessActionCode;
              connFlag.leaseObligationCode = leaseObligationCode;
              connFlag.leaseComment = leaseObligationCode === "Y" ? leaseComment.slice(0, 360) : "";
              connFlag.reminderFlag = reminderFlag;
              connFlag.reminderDays = reminderDays === "[No Value]" || reminderDays === "Select..." ? "0" : reminderDays;
              connFlag.validateEmailFlag = !(validateEmailFlag === null || validateEmailFlag === "n");
              connFlag.enrollBudgetBillFlag = "false"; // fixed for start service new and existing
              connFlag.addRiderContractFlag = "false"; // fixed for start service new and existing
              connFlag.holdWorkOrderFlag = IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_depositHold").getLabel().toLowerCase() === "yes" ? "true" : "false";

              startService.connectionOrderFlags = connFlag;

              startService.tariffScheduleCode = tariffScheduleCode;
              const memo = `OSvC: ${fullName}, connect, ${dateWantedFormatted}, ${depositActionPhrase}, ${userLogin}, ${userPhone}`;
              startService.memo = memo.slice(0, 360);

              Payload.startService = startService;
              Request.Header = Header;
              Request.Payload = Payload;

              const requestString = JSON.stringify(Request);
              resolve(requestString);
            });
          });
        });
      });
    });
  });
}

function callStartServiceAPI() {
  return new Promise((resolve, reject) => {
    buildStartServiceRequest().then((requestString) => {
      try {
        const messageObj = {};
        messageObj.api = "api";
        messageObj.messageString = requestString;
        messageObj.apiUrl = "CUSTOM_CFG_ISSUE_CONNECT_EXISTING_API";
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
            logAPI(startTimeString, endTimeString, timeDiff, requestString, responseString, `Selected Premise: ${selectedPremiseNo}`, `Start Service`, "CUSTOM_CFG_ISSUE_CONNECT_EXISTING_API");

            if (response.Result.status.toLowerCase() === "ok" && response.Result.responseDescription.toLowerCase() === "success") {
              newAccountNumber = response.Payload.startService.accountNo;
              usageMetricsLogMain(transactionType, "Success", newAccountNumber);
              resolve("success");
            } else {
              errorMessage = response.Result.errors.errorMessage;
              usageMetricsLogMain(transactionType, "Failed");
              resolve("failed");
            }
          })
          .catch(() => {
            usageMetricsLogMain(transactionType, "Failed");
            resolve("failed");
          });
      } catch (e) {
        usageMetricsLogMain(transactionType, "Failed");
        resolve("failed");
      }
    });
  });
}

function callSubmitOrderAPI(extensionProvider, workspaceRecord) {
  // reset values
  newAccountNumber = "";
  errorMessage = "";
  successMessage = "";

  const recordId = workspaceRecord.getWorkspaceRecordId();

  extensionProvider.getGlobalContext().then((globalContext) => {
    globalContext.invokeAction("getLoggedInDetails").then((loggedInName) => {
      const userDetails = loggedInName.result.find((i) => i != null);
      userId = userDetails.login.split("@")[0].toUpperCase();
      userLogin = userDetails.login;
      userPhone = userDetails.phone;

      globalContext.invokeAction("getCompletedObligations", recordId).then((obligations) => {
        const completeObligationResult = obligations.result.find((i) => i != null);
        if (completeObligationResult !== "comments_required") {
          workspaceRecord.triggerNamedEvent("StartServiceShowLoading");
          const obligtaionsArray = obligations.result.find((i) => i != null);
          console.log("obligations array", obligtaionsArray);
          const completedObligationsArr = JSON.parse(obligtaionsArray);
          // const completedObligationsArr = JSON.parse(sessionStorage.getItem(`completed_obligations_${selectedPremiseNo}`));

          // Greater than 0 means there are checked obligations to be completed
          if (completedObligationsArr != null && completedObligationsArr.length > 0) {
            // THIS CODE CALLS OBLIGATION AND START SERVICE IN PARALLEL
            // Promise.allSettled([callObligationApi(), callStartServiceAPI()]).then((results) => {
            //   // check the obligation api result
            //   let obligationAPISuccessFlag = results[0].status === "fulfilled" && results[0].value === "success";

            //   // check the start service api result
            //   let startSvcAPISuccessFlag = results[1].status === "fulfilled" && results[1].value === "success";

            //   if (!obligationAPISuccessFlag && startSvcAPISuccessFlag) {
            //     successMessage = `Order has been issued but is held. New account number is ${newAccountNumber}. GPC CSS Issue Reporting form needs to be completed to release the obligation.`;
            //     sessionStorage.setItem("start_service_success_message", successMessage);
            //     workspaceRecord.triggerNamedEvent("SuccessStartService");
            //   } else if (!startSvcAPISuccessFlag) {
            //     sessionStorage.setItem("start_service_error", errorMessage);
            //     workspaceRecord.triggerNamedEvent("FailedStartService");
            //   } else {
            //     let formattedAcctNum = newAccountNumber.padStart(10, "0");
            //     formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
            //     successMessage = `Start Service for account number ${formattedAcctNum} was issued successfully`;
            //     sessionStorage.setItem("start_service_success_message", successMessage);
            //     workspaceRecord.triggerNamedEvent("SuccessStartService");
            //   }
            // });

            // THIS CODE CALLS OBLIGATION AND START SERVICE SEQUENCIALLY
            globalContext.invokeAction("SubmitObligation");
            callObligationApi(completedObligationsArr).then((response) => {
              globalContext.invokeAction("IssueOrder");
              callStartServiceAPI().then((issueOrderResponse) => {
                // obligation failed but issue order was successful
                if (response !== "success" && issueOrderResponse === "success") {
                  let formattedAcctNum = newAccountNumber.padStart(10, "0");
                  formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
                  successMessage = `Order issued successfully but the obligations were not completed due to an error. Please use CSS to complete the obligations. New account number is ${formattedAcctNum}.`;
                  sessionStorage.setItem("start_service_success_message", successMessage);
                  workspaceRecord.triggerNamedEvent("SuccessStartService");
                }
                // both obligations and issue order were successful
                else if (response === "success" && issueOrderResponse === "success") {
                  let formattedAcctNum = newAccountNumber.padStart(10, "0");
                  formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
                  successMessage = `Start Service for account number ${formattedAcctNum} was issued successfully`;
                  sessionStorage.setItem("start_service_success_message", successMessage);
                  workspaceRecord.triggerNamedEvent("SuccessStartService");
                }
                // issue order failed
                else if (issueOrderResponse !== "success") {
                  sessionStorage.setItem("start_service_error", errorMessage);
                  workspaceRecord.triggerNamedEvent("FailedStartService");
                }
                globalContext.invokeAction("ApiComplete");
              });
            });
          } else {
            globalContext.invokeAction("IssueOrder");
            Promise.allSettled([callStartServiceAPI()]).then((results) => {
              if (results[0].status === "fulfilled" && results[0].value === "success") {
                let formattedAcctNum = newAccountNumber.padStart(10, "0");
                formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
                successMessage = `Start Service for account number ${formattedAcctNum} was issued successfully`;
                sessionStorage.setItem("start_service_success_message", successMessage);
                workspaceRecord.triggerNamedEvent("SuccessStartService");
              } else {
                sessionStorage.setItem("start_service_error", errorMessage);
                workspaceRecord.triggerNamedEvent("FailedStartService");
              }
              globalContext.invokeAction("ApiComplete");
            });
          }
        } else {
          workspaceRecord.triggerNamedEvent("ObligationCommentsRequired");
        }
      });

      // workspaceRecord.getFieldValues(["socoMLP$service_order.soco_start_selected_premise"]).then((IFieldDetails) => {
      //   selectedPremiseNo = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_premise").getLabel();
      // });
    });
  });
}

function callTransferSubmitOrderAPI(extensionProvider, workspaceRecord) {
  // reset values
  newAccountNumber = "";
  errorMessage = "";
  successMessage = "";

  const recordId = workspaceRecord.getWorkspaceRecordId();

  extensionProvider.getGlobalContext().then((globalContext) => {
    globalContext.invokeAction("getLoggedInDetails").then((loggedInName) => {
      const userDetails = loggedInName.result.find((i) => i != null);
      userId = userDetails.login.split("@")[0].toUpperCase();
      userLogin = userDetails.login;
      userPhone = userDetails.phone;

      globalContext.invokeAction("getCompletedObligations", recordId).then((obligations) => {
        const completeObligationResult = obligations.result.find((i) => i != null);
        if (completeObligationResult !== "comments_required") {
          workspaceRecord.triggerNamedEvent("StartServiceShowLoading");
          const obligtaionsArray = obligations.result.find((i) => i != null);
          const completedObligationsArr = JSON.parse(obligtaionsArray);
          // const completedObligationsArr = JSON.parse(sessionStorage.getItem(`completed_obligations_${selectedPremiseNo}`));

          // Greater than 0 means there are checked obligations to be completed
          if (completedObligationsArr != null && completedObligationsArr.length > 0) {
            // THIS CODE CALLS OBLIGATION AND START SERVICE IN PARALLEL
            // Promise.allSettled([callObligationApi(), callTransferStartServiceAPI()]).then((results) => {
            //   // check the obligation api result
            //   let obligationAPISuccessFlag = results[0].status === "fulfilled" && results[0].value === "success";

            //   // check the start service api result
            //   let startSvcAPISuccessFlag = results[1].status === "fulfilled" && results[1].value === "success";

            //   if (!obligationAPISuccessFlag && startSvcAPISuccessFlag) {
            //     successMessage = `Order has been issued but is held. New account number is ${newAccountNumber}. GPC CSS Issue Reporting form needs to be completed to release the obligation.`;
            //     sessionStorage.setItem("start_service_success_message", successMessage);
            //     workspaceRecord.triggerNamedEvent("SuccessStartService");
            //   } else if (!startSvcAPISuccessFlag) {
            //     sessionStorage.setItem("start_service_error", errorMessage);
            //     workspaceRecord.triggerNamedEvent("FailedStartService");
            //     workspaceRecord.triggerNamedEvent("ExpandPanelHeader");
            //   } else {
            //     let formattedAcctNum = newAccountNumber.padStart(10, "0");
            //     formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
            //     successMessage = `Transfer Service for account number ${formattedAcctNum} was issued successfully`;
            //     sessionStorage.setItem("start_service_success_message", successMessage);
            //     workspaceRecord.triggerNamedEvent("SuccessStartService");
            //   }
            // });

            // THIS CODE CALLS OBLIGATION AND START SERVICE IN SEQUENCE
            globalContext.invokeAction("SubmitObligation");
            callObligationApi(completedObligationsArr).then((response) => {
              globalContext.invokeAction("IssueOrder");
              callTransferStartServiceAPI().then((issueOrderResponse) => {
                // obligation failed but issue order was successful
                if (response !== "success" && issueOrderResponse === "success") {
                  let formattedAcctNum = newAccountNumber.padStart(10, "0");
                  formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
                  successMessage = `Order issued successfully but the obligations were not completed due to an error. Please use CSS to complete the obligations. New account number is ${formattedAcctNum}.`;
                  sessionStorage.setItem("start_service_success_message", successMessage);
                  workspaceRecord.triggerNamedEvent("SuccessStartService");
                }
                // both obligations and issue order were successful
                else if (response === "success" && issueOrderResponse === "success") {
                  let formattedAcctNum = newAccountNumber.padStart(10, "0");
                  formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
                  successMessage = `Transfer Service for account number ${formattedAcctNum} was issued successfully`;
                  sessionStorage.setItem("start_service_success_message", successMessage);
                  workspaceRecord.triggerNamedEvent("SuccessStartService");
                }
                // issue order failed
                else if (issueOrderResponse !== "success") {
                  sessionStorage.setItem("start_service_error", errorMessage);
                  workspaceRecord.triggerNamedEvent("FailedStartService");
                  workspaceRecord.triggerNamedEvent("ExpandPanelHeader");
                }
                globalContext.invokeAction("ApiComplete");
              });
            });
          } else {
            globalContext.invokeAction("IssueOrder");
            Promise.allSettled([callTransferStartServiceAPI()]).then((results) => {
              if (results[0].status === "fulfilled" && results[0].value === "success") {
                let formattedAcctNum = newAccountNumber.padStart(10, "0");
                formattedAcctNum = `${formattedAcctNum.slice(0, 5)}-${formattedAcctNum.slice(-5)}`;
                successMessage = `Transfer Service for account number ${formattedAcctNum} was issued successfully`;
                sessionStorage.setItem("start_service_success_message", successMessage);
                workspaceRecord.triggerNamedEvent("SuccessStartService");
              } else {
                sessionStorage.setItem("start_service_error", errorMessage);
                workspaceRecord.triggerNamedEvent("FailedStartService");
                workspaceRecord.triggerNamedEvent("ExpandPanelHeader");
              }
              globalContext.invokeAction("ApiComplete");
            });
          }
        } else {
          workspaceRecord.triggerNamedEvent("ObligationCommentsRequired");
        }
      });
    });
  });
}

function callTransferStartServiceAPI() {
  return new Promise((resolve, reject) => {
    buildTransferStartServiceRequest().then((requestString) => {
      try {
        const messageObj = {};
        messageObj.api = "api";
        messageObj.messageString = requestString;
        messageObj.apiUrl = "CUSTOM_CFG_SOCOMLP_CONNECT_SERVICE"; // "CUSTOM_CFG_ISSUE_CONNECT_TRANSFER_API";
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
            logAPI(startTimeString, endTimeString, timeDiff, requestString, responseString, `Selected Premise: ${selectedPremiseNo}`, `Start Service - Transfer`, "CUSTOM_CFG_SOCOMLP_CONNECT_SERVICE");

            if (response.Result.status.toLowerCase() === "ok" && response.Result.responseDescription.toLowerCase() === "success") {
              newAccountNumber = response.Payload.ConnectService.accountNo; // response.Payload.transferService.accountNo;
              usageMetricsLogMain("Start Service - Transfer", "Success", newAccountNumber);
              resolve("success");
            } else {
              errorMessage = response.Result.errors.errorMessage;
              usageMetricsLogMain("Start Service - Transfer", "Failed");
              resolve("failed");
            }
          })
          .catch(() => {
            usageMetricsLogMain("Start Service - Transfer", "Failed");
            resolve("failed");
          });
      } catch (e) {
        usageMetricsLogMain("Start Service - Transfer", "Failed");
        resolve("failed");
      }
    });
  });
}

function buildTransferStartServiceRequest() {
  return new Promise((resolve, reject) => {
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceFinalItems", "1").then((extensionProvider) => {
      extensionProvider.getGlobalContext().then((globalContext) => {
        profileId = globalContext.getProfileId();
        interfaceUrl = globalContext.getInterfaceUrl();
        globalContext.getSessionToken().then((session) => {
          sessionToken = session;
          extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
            const Request = {};
            const Header = {};
            const Payload = {};
            const BaseRequest = {};
            // const transferService = {};
            const ConnectService = {};
            const Account = {};
            const ServiceAddress = {};
            // const account = {};
            // const mailingAddress = {};
            const Deposit = {};
            const unpaidAccounts = [];
            // const connectionOrderFlags = {};

            // Header.verb = "post";
            // Header.noun = "connectService";
            // Header.revision = "1.4";
            // Header.userId = "EU_OSC";
            // Header.organization = "SOCO";
            // Header.transactionId = getCurrentTimestamp();

            BaseRequest.transactionId = getCurrentTimestamp();
            BaseRequest.transactionType = "New";
            BaseRequest.userId = userId;

            const searchFields = [
              "Contact.c$acct_num",
              "socoMLP$service_order.soco_start_selected_premise",
              "socoMLP$service_order.soco_start_custinfo_Fname",
              "socoMLP$service_order.soco_start_custinfo_Mname",
              "socoMLP$service_order.soco_start_custinfo_Lname",
              "socoMLP$service_order.soco_start_custinfo_primaryph",
              "socoMLP$service_order.soco_start_custinfo_alternatep",
              "socoMLP$service_order.soco_start_custinfo_emailAddr",
              "socoMLP$service_order.soco_start_addressline1",
              "socoMLP$service_order.soco_start_addressline2",
              "socoMLP$service_order.soco_start_city",
              "socoMLP$service_order.soco_start_state",
              "socoMLP$service_order.soco_start_zipCode",
              "socoMLP$service_order.soco_deposit_action",
              "socoMLP$service_order.soco_start_selected_line1",
              "socoMLP$service_order.soco_start_selected_line2",
              "socoMLP$service_order.soco_start_selected_city",
              "socoMLP$service_order.soco_start_selected_state",
              "socoMLP$service_order.soco_start_selected_zipCode",
              "socoMLP$service_order.soco_start_deposit_action",
              "socoMLP$service_order.soco_start_deposit_amt",
              "socoMLP$service_order.soco_start_custinfo_SSN",
              "socoMLP$service_order.soco_start_date_wanted",
              "socoMLP$service_order.soco_start_paperless_action",
              "socoMLP$service_order.soco_start_paperless_reminder",
              "socoMLP$service_order.soco_start_paperless_daysdue",
              "socoMLP$service_order.soco_start_lease_leaseHold",
              "socoMLP$service_order.soco_start_val_email_flag",
              "socoMLP$service_order.soco_start_lease_incomingPhone",
              "socoMLP$service_order.soco_start_lease_callbackNum",
              "socoMLP$service_order.soco_start_lease_reasonVer",
              "socoMLP$service_order.soco_start_rate_Rate_Options",
              "socoMLP$service_order.soco_start_rate_RateOptions",
              "Contact.socoMLP$soco_deposit_on_hand",
              "socoMLP$service_order.soco_Transfer_Autopay",
              "socoMLP$service_order.soco_Date_Wanted",
              "Contact.socoMLP$soco_customer_number",
              "socoMLP$service_order.soco_transfer_seniordiscount",
              "socoMLP$service_order.soco_start_deposit_depositHold",
              "socoMLP$service_order.soco_Transfer_BudgetBilling",
              "socoMLP$service_order.soco_start_selected_premise",
            ];

            workspaceRecord.getFieldValues(searchFields).then(async (IFieldDetails) => {
              selectedPremiseNo = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_premise").getLabel();
              const dateWanted = IFieldDetails.getField("socoMLP$service_order.soco_start_date_wanted").getLabel();
              let dateWantedFormatted = "";
              let connEffDate = "";
              if (dateWanted) {
                const dateWantedISO = getFormattedDateFromField(dateWanted.toString());
                const dateTest = moment.utc(moment(dateWanted)).format("YYYY-MM-DD");
                const dateTestFormat = moment.utc(moment(dateWanted)).format("MM/DD/YYYY");
                // const dateWantedObj = new Date(dateWantedISO);
                // const dateWantedWithTzOffset = new Date(dateWantedObj.getTime() + Math.abs(dateWantedObj.getTimezoneOffset() * 60000));
                // const dateWantedMonth = (dateWantedWithTzOffset.getMonth() + 1).toString().padStart(2, "0");
                // const dateWantedDay = dateWantedWithTzOffset.getDate().toString().padStart(2, "0");
                // const dateWantedYear = dateWantedWithTzOffset.getFullYear();

                const dateWantedArr = dateWantedISO.split("-");

                dateWantedFormatted = dateTestFormat;
                connEffDate = dateTest;
              } else {
                dateWantedFormatted = "";
                connEffDate = "";
              }

              // transferService.userId = userId;
              ConnectService.connectionEffectiveDate = connEffDate;

              // Account Details
              Account.PrimaryContact = {};
              Account.PrimaryContact.firstName = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Fname").getLabel();
              Account.PrimaryContact.middleInitial = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Mname").getLabel();
              Account.PrimaryContact.lastName = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_Lname").getLabel();
              // account.primaryContactPhone = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_primaryph").getLabel();
              // account.secondaryContactPhone = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_alternatep").getLabel();

              const primPhone = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_primaryph").getLabel();
              Account.PrimaryContact.primaryContactPhone = primPhone ? primPhone.replace(/\W/g, "") : "";

              let altPhone = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_alternatep").getLabel();

              if (altPhone && altPhone.toLowerCase() === "none") {
                altPhone = "";
              } else if (!altPhone) {
                altPhone = "";
              }

              Account.PrimaryContact.secondaryContactPhone = altPhone ? altPhone.replace(/\W/g, "") : "";

              Account.PrimaryContact.email = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_emailAddr").getLabel();

              let fullName = "";
              fullName += Account.PrimaryContact.firstName ? `${Account.PrimaryContact.firstName} ` : "";
              fullName += Account.PrimaryContact.middleInitial ? `${Account.PrimaryContact.middleInitial} ` : "";
              fullName += Account.PrimaryContact.lastName ? `${Account.PrimaryContact.lastName}` : "";

              const last4SSN = IFieldDetails.getField("socoMLP$service_order.soco_start_custinfo_SSN").getLabel().slice(-4);

              Account.PrimaryContact.Address = {};
              Account.PrimaryContact.Address.addressLine1 = IFieldDetails.getField("socoMLP$service_order.soco_start_addressline1").getLabel();
              Account.PrimaryContact.Address.addressLine2 = IFieldDetails.getField("socoMLP$service_order.soco_start_addressline2").getLabel();
              Account.PrimaryContact.Address.city = IFieldDetails.getField("socoMLP$service_order.soco_start_city").getLabel();
              Account.PrimaryContact.Address.state = IFieldDetails.getField("socoMLP$service_order.soco_start_state").getLabel();
              Account.PrimaryContact.Address.zip = IFieldDetails.getField("socoMLP$service_order.soco_start_zipCode").getLabel();

              // account.mailingAddress = mailingAddress;
              // ConnectService.Account = Account;

              const selectedAddr1 = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line1").getLabel()
                ? IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line1").getLabel()
                : "";
              const selectedAddr2 = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line2").getLabel()
                ? IFieldDetails.getField("socoMLP$service_order.soco_start_selected_line2").getLabel()
                : "";
              const selectedCity = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_city").getLabel();
              const selectedState = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_state").getLabel();
              const selectedZip = IFieldDetails.getField("socoMLP$service_order.soco_start_selected_zipCode").getLabel();

              selectedAddr = selectedAddr1 ? `${selectedAddr1.trim()} ` : "";
              selectedAddr += selectedAddr2 ? `${selectedAddr2.trim()} ` : "";
              selectedAddr += selectedCity ? `${selectedCity} ` : "";
              selectedAddr += selectedState ? `${selectedState} ` : "";
              selectedAddr += selectedZip ? `${selectedZip}` : "";
              selectedAddr = selectedAddr.trim();

              ServiceAddress.addressCompressed = selectedAddr;
              Account.ServiceAddress = ServiceAddress;

              // Get Account Details
              let acctNo = IFieldDetails.getField("Contact.c$acct_num").getLabel();
              let acctNoFormatted = "";

              // This is an existing cutomer
              let customerNo = "";
              let companyCode = "";
              if (acctNo !== null && acctNo !== undefined && acctNo !== "") {
                acctNo = acctNo.replace(/\W/g, "");
                const ApiResponseInfo = await globalContext.invokeAction("getAccountInfo", acctNo);
                const AcctInfo = ApiResponseInfo.result.find((i) => i != null);
                companyCode = AcctInfo.customerInfo.Payload.CustomerInfo.operatingCompany === "GPC" ? "2" : "5";
                customerNo = AcctInfo.customerInfo.Payload.CustomerInfo.customerNo;

                acctNoFormatted = acctNo.padStart(10, "0");
                acctNoFormatted = `${acctNoFormatted.slice(0, 5)}-${acctNoFormatted.slice(-5)}`;
              } else {
                /* set for new customers */
                acctNo = "";
                companyCode = "";
                customerNo = customerNo = IFieldDetails.getField("Contact.socoMLP$soco_customer_number").getLabel();
              }

              Account.customerNo = customerNo;
              Account.companyCode = companyCode;
              Account.premiseNo = selectedPremiseNo;

              // Get meter details
              let meterDetails = sessionStorage.getItem(`premise_details_${selectedPremiseNo}`);
              sessionStorage.removeItem(`premise_details_${selectedPremiseNo}`);

              const ServicePoint = {};
              const Meters = {};

              const rateOptionsField = IFieldDetails.getField("socoMLP$service_order.soco_start_rate_RateOptions").getLabel();
              const rateOptionSelected = rateOptionsField || IFieldDetails.getField("socoMLP$service_order.soco_start_rate_Rate_Options").getLabel();
              let tariffScheduleCode = "";

              switch (rateOptionSelected) {
                case "FlatBill First Year":
                  tariffScheduleCode = "091";
                  break;
                case "Residential":
                  tariffScheduleCode = "025";
                  break;
                case "Smart Usage":
                  tariffScheduleCode = "136";
                  break;
                default:
                  break;
              }
              ServicePoint.tariffScheduleCode = tariffScheduleCode;

              // Selecting a premise was made
              if (meterDetails !== "null" && meterDetails !== null) {
                meterDetails = JSON.parse(meterDetails);
                ServicePoint.servicePointNumber = meterDetails.Payload.PendingOrdersAndObligations.getPremise[0].servicePoint[0].servicePointNumber;

                Meters.meterNo = meterDetails.Payload.PendingOrdersAndObligations.getPremise[0].servicePoint[0].meters[0].meterNo;
                Meters.meterPointLocationCode = meterDetails.Payload.PendingOrdersAndObligations.getPremise[0].servicePoint[0].meters[0].meterPointLocationCode;
              } else {
                ServicePoint.servicePointNumber = "";

                Meters.meterNo = "";
                Meters.meterPointLocationCode = "";
              }

              ServicePoint.Meters = Meters;
              Account.ServicePoint = ServicePoint;

              ConnectService.Account = Account;

              // Get Deposit Details

              /*   let depositAmt = "";
              let depositComment = "";
              const depositAction = IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_action").getLabel();
              switch (depositAction) {
                case "Quote Deposit":
                  depositActionCode = "5";
                  depositAmt = IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_amt").getLabel().replace("$", "");
                  depositComment = `${fullName}, ${last4SSN}, CREDIT-DECISION, $${depositAmt}, ${userLogin}, ${userPhone}`;
                  depositActionPhrase = `$${depositAmt}`;
                  break;
                case "Waive Deposit":
                  depositActionCode = "1";
                  depositActionPhrase = "No Deposit";
                  depositAmt = "0";
                  break;
                case "Transfer Deposit":
                  depositActionCode = "4";
                  depositAmt = IFieldDetails.getField("socoMLP$service_order.soco_start_deposit_amt").getLabel().replace("$", "");
                  break;
                default:
                  depositAmt = "0";
                  break;
              }
              deposit.depositActionCode = depositActionCode;
              deposit.depositComment = depositComment.slice(0, 360);
              deposit.depositAmount = depositAmt; */
              let depositActionPhrase = "";
              const depositAmt = IFieldDetails.getField("Contact.socoMLP$soco_deposit_on_hand").getLabel()
                ? IFieldDetails.getField("Contact.socoMLP$soco_deposit_on_hand").getLabel().replace("$", "")
                : "$0.00";
              const deposiFloat = depositAmt ? parseFloat(depositAmt.replace("$", "").trim()).toFixed(2) : 0.0;
              if (deposiFloat > 0) {
                Deposit.depositActionCode = "4";
                Deposit.depositComment = `${fullName}, ${last4SSN}, Deposit Transferred, $${deposiFloat}, ${userLogin}, ${userPhone}`;
                depositActionPhrase = `Deposit Transferred, $${Deposit.depositComment}`;
              } else {
                Deposit.depositActionCode = "4";
                Deposit.depositComment = `${fullName}, ${last4SSN}, Deposit Transferred, $0.00, ${userLogin}, ${userPhone}`;
                depositActionPhrase = `Deposit Transferred, $0.00`;
              }

              Deposit.depositAmount = IFieldDetails.getField("Contact.socoMLP$soco_deposit_on_hand").getLabel().replace("$", "").trim();

              ConnectService.Deposit = Deposit;

              // Get Unpaid Accounts
              /* const unpaidAcct = {};
              unpaidAcct.accountNo = "";
              unpaidAcct.unpaidAmount = "";

              unpaidAccounts.push(unpaidAcct);
              transferService.unpaidAccounts = unpaidAccounts;
              transferService.unpaidBillComment = ""; */

              // transferServiceData

              const eft = IFieldDetails.getField("socoMLP$service_order.soco_Transfer_Autopay").getLabel() === "Yes" ? "true" : "false";
              const discDate = new Date(IFieldDetails.getField("socoMLP$service_order.soco_Date_Wanted").getLabel());

              const TransferServiceData = {};
              TransferServiceData.disconnectAccountNo = acctNo;
              TransferServiceData.disconnectDate = formatDate(discDate);
              TransferServiceData.eftFlag = eft;
              const unpaidAcct = {};
              // let unpaidAmountTotal = "";
              let i = "";
              try {
                const array_data = JSON.parse(sessionStorage.getItem(`unpaidBills_${acctNo}`));
                if (array_data != null && array_data.length > 0) {
                  for (i in array_data) {
                    // unpaidAmountTotal = unpaidAmountTotal + array_data[i][0] + ", " + array_data[i][1] + ",";
                    let unpaidBillAcct = array_data[i][0].replace("-", "");
                    unpaidBillAcct = unpaidBillAcct.padStart(10, "0");
                    unpaidBillAcct = `${unpaidBillAcct.slice(0, 5)}-${unpaidBillAcct.slice(-5)}`;
                    let comment = `${fullName}, ${last4SSN}, ${unpaidBillAcct}, ${array_data[i][1]}, ${userLogin}, ${userPhone}`;
                    unpaidAccounts.push({
                      accountNo: array_data[i][0].replace("-", ""),
                      unpaidAmount: array_data[i][1].replace("$", ""),
                      unpaidBillComment: comment.slice(0, 360),
                    });
                  }
                } else {
                  unpaidAcct.accountNo = "";
                  unpaidAcct.unpaidAmount = "";
                  unpaidAcct.unpaidBillComment = "";
                  unpaidAccounts.push(unpaidAcct);
                }
              } catch {
                unpaidAcct.accountNo = "";
                unpaidAcct.unpaidAmount = "";
                unpaidAcct.unpaidBillComment = "";
                unpaidAccounts.push(unpaidAcct);
              }
              TransferServiceData.UnpaidAccounts = unpaidAccounts;
              // try {
              //   if (unpaidAccounts != null && unpaidAccounts.length > 0) {
              //     TransferServiceData.unpaidBillComment = `${fullName}, ${last4SSN}, ${unpaidAmountTotal} ${userLogin}, ${userPhone}`;
              //   } else {
              //     TransferServiceData.unpaidBillComment = "";
              //   }
              // } catch {
              //   TransferServiceData.unpaidBillComment = "";
              // }

              ConnectService.TransferServiceData = TransferServiceData;

              // Connection Order Flags
              const connFlag = {};
              const paperlessAction = IFieldDetails.getField("socoMLP$service_order.soco_start_paperless_action").getLabel();

              let paperlessActionCode = "";
              switch (paperlessAction) {
                case "Enroll in Paperless":
                  paperlessActionCode = "01";
                  break;
                case "Send Paperless Info":
                  paperlessActionCode = "04";
                  break;
                case "Not Interested in Paperless":
                  paperlessActionCode = "05";
                  break;
                default:
                  break;
              }

              const leaseObligationCode = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_leaseHold").getLabel().toLowerCase() === "yes" ? "Y" : "N";
              const reminderFlag = IFieldDetails.getField("socoMLP$service_order.soco_start_paperless_reminder").getLabel().toLowerCase() === "yes";
              const reminderDays = IFieldDetails.getField("socoMLP$service_order.soco_start_paperless_daysdue").getLabel();
              const validateEmailFlag = IFieldDetails.getField("socoMLP$service_order.soco_start_val_email_flag").getLabel();
              const incomingNum = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_incomingPhone").getLabel();
              const callbackNum = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_callbackNum").getLabel();
              const reasonVer = IFieldDetails.getField("socoMLP$service_order.soco_start_lease_reasonVer").getLabel();
              const leaseComment = `${fullName}, ${last4SSN}, ${acctNoFormatted}, ${selectedAddr}, ${incomingNum}, ${callbackNum}, ${reasonVer}, ${userLogin}, ${userPhone}`;

              connFlag.paperlessIndicatorCode = paperlessActionCode;
              connFlag.leaseObligationCode = leaseObligationCode;
              connFlag.leaseComment = leaseObligationCode === "Y" ? leaseComment.slice(0, 360) : "";
              connFlag.reminderFlag = reminderFlag;
              connFlag.reminderDays = reminderDays === "[No Value]" || reminderDays === "Select..." ? "0" : reminderDays;
              connFlag.validateEmailFlag = !(validateEmailFlag === null || validateEmailFlag === "n");
              connFlag.enrollBudgetBillFlag = IFieldDetails.getField("socoMLP$service_order.soco_Transfer_BudgetBilling").getLabel().toLowerCase() === "yes" ? "true" : "false";
              connFlag.addRiderContractFlag = IFieldDetails.getField("socoMLP$service_order.soco_transfer_seniordiscount").getLabel().toLowerCase() === "yes" ? "true" : "false";
              connFlag.holdWorkOrderFlag = "false"; // fixed for transfer

              ConnectService.ConnectionOrderFlags = connFlag;

              // transferService.tariffScheduleCode = tariffScheduleCode;
              const riderMemo = connFlag.addRiderContractFlag === "true" ? "Senior Citizen Discount Transferred" : "";
              const memo = `OSvC: ${fullName}, ${last4SSN}, ${depositActionPhrase}, ${riderMemo}, ${userLogin}, ${userPhone}`;
              ConnectService.memo = memo.slice(0, 360);

              Payload.BaseRequest = BaseRequest;
              Payload.ConnectService = ConnectService;
              // Request.Header = Header;
              Request.Payload = Payload;

              const requestString = JSON.stringify(Request);
              resolve(requestString);
            });
          });
        });
      });
    });
  });
}

ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceFinalItems", "1").then((extensionProvider) => {
  extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
    workspaceRecord.addNamedEventListener("FinalItemsNext", () => {
      // This is for the Next button of current panel
      callSubmitOrderAPI(extensionProvider, workspaceRecord);
    });
    workspaceRecord.addNamedEventListener("TransitionToTransfer", () => {
      // Transition of screen from Start to Transfer
      document.getElementById("accordion").classList.add("down");
      document.getElementById("header").classList.add("container-white");
      document.getElementById("checkMark").classList.add("hide");
    });
    workspaceRecord.addNamedEventListener("TransferStartSubmit", () => {
      // This is for the Next button of current panel
      callTransferSubmitOrderAPI(extensionProvider, workspaceRecord);
    });
    workspaceRecord.addNamedEventListener("NewTab", () => {
      // window.open("https://google.com", "_blank");
    });
    workspaceRecord.addNamedEventListener("StartServiceDefaultLoad", () => {
      // This is for the Default Load of Start Service
      document.getElementById("checkMark").classList.add("hide");
      document.getElementById("header").classList.add("container-white");
      document.getElementById("accordion").classList.remove("up");
    });
    // workspaceRecord.addNamedEventListener("FinalItemsPrevious", () => {
    //   // This is for the previous button of current panel
    //   document.getElementById("checkMark").classList.add("hide");
    //   document.getElementById("header").classList.add("container-white");
    //   document.getElementById("accordion").classList.remove("up");
    // });
    workspaceRecord.addNamedEventListener("RateOptionsNext", () => {
      // This is for the Next button from previous panel
      document.getElementById("checkMark").classList.add("hide");
      document.getElementById("header").classList.remove("container-white");
      document.getElementById("accordion").classList.add("up");
    });

    // For Cancel Modal
    workspaceRecord.addNamedEventListener("FinalItemsPrevious", () => {
      extensionProvider.registerUserInterfaceExtension((IUserInterfaceContext) => {
        IUserInterfaceContext.getModalWindowContext().then((IModalWindowContext) => {
          const modalWindow = IModalWindowContext.createModalWindow();
          const fieldNames = ["socoMLP$service_order.soco_service_order_type"];
          workspaceRecord.getFieldValues(fieldNames).then((IFieldDetails) => {
            const serviceOrderType = IFieldDetails.getField("socoMLP$service_order.soco_service_order_type").getLabel();
            modalWindow.setTitle(serviceOrderType);
            modalWindow.setContentUrl("../CancelModal/index.html");
            modalWindow.setHeight("190px");
            modalWindow.setWidth("535px");
            modalWindow.render();
          });
        });
      });
      document.getElementById("checkMark").classList.add("hide");
      document.getElementById("header").classList.remove("container-white");
      document.getElementById("accordion").classList.add("up");
    });
    workspaceRecord.addFieldValueListener("socoMLP$service_order.soco_service_order_type", () => {
      workspaceRecord.getFieldValues(["socoMLP$service_order.soco_service_order_type"]).then((IFieldDetails) => {
        const type = IFieldDetails.getField("socoMLP$service_order.soco_service_order_type").getLabel();
        if (type === "Start Service") {
          const todayTime = new Date();
          const todayDateWithTzOffset = new Date(todayTime.getTime() + Math.abs(todayTime.getTimezoneOffset() * 60000));
          const month = (todayDateWithTzOffset.getMonth() + 1).toString().padStart(2, "0");
          const day = todayDateWithTzOffset.getDate().toString().padStart(2, "0");
          const year = todayDateWithTzOffset.getFullYear();
          const formattedDate = `${month}/${day}/${year}`;
          workspaceRecord.updateField("socoMLP$service_order.soco_start_date_wanted", null);
        } else if (type === "Transfer Service") {
          console.log("set date to null");
          workspaceRecord.updateField("socoMLP$service_order.soco_start_date_wanted", null);
        }
      });
    });
  });
});

document.querySelector("#accordion").addEventListener("click", (e) => {
  if (e.target.classList.contains("up")) {
    e.target.classList.remove("up");
    document.getElementById("header").classList.add("container-white");
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceFinalItems", "1").then((extensionProvider) => {
      extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
        workspaceRecord.triggerNamedEvent("HideStartFinalItemsHeader"); // Thsi is to make panel white
      });
    });
  } else {
    e.target.classList.add("up");
    document.getElementById("header").classList.remove("container-white");
    document.getElementById("checkMark").classList.add("hide");
    ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceFinalItems", "1").then((extensionProvider) => {
      extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
        workspaceRecord.triggerNamedEvent("ShowStartFinalItemsHeader"); // Thsi is to make panel blue
      });
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  ORACLE_SERVICE_CLOUD.extension_loader.load("StartServiceFinalItems", "1").then((extensionProvider) => {
    extensionProvider.registerWorkspaceExtension((workspaceRecord) => {
      workspaceRecord.getFieldValues(["socoMLP$service_order.soco_service_order_type"]).then((IFieldDetails) => {
        const type = IFieldDetails.getField("socoMLP$service_order.soco_service_order_type").getLabel();
        if (type === "Start Service") {
          const todayTime = new Date();
          const todayDateWithTzOffset = new Date(todayTime.getTime() + Math.abs(todayTime.getTimezoneOffset() * 60000));
          const month = (todayDateWithTzOffset.getMonth() + 1).toString().padStart(2, "0");
          const day = todayDateWithTzOffset.getDate().toString().padStart(2, "0");
          const year = todayDateWithTzOffset.getFullYear();
          const formattedDate = `${month}/${day}/${year}`;
          workspaceRecord.updateField("socoMLP$service_order.soco_start_date_wanted", null);
        } else if (type === "Transfer Service") {
          workspaceRecord.updateField("socoMLP$service_order.soco_start_date_wanted", null);
        }
      });
    });
  });
});
