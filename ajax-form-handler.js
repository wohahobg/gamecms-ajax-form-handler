let ajaxFormHandler = (function () {

    let currentFormId
    let dynamicFormId = 'default';
    let toastTimer = 7000;
    let logRequest = function (data, status, callbackName) {
        $.ajax({
            url: '/data',
            method: 'POST',
            data: {
                response: data, status: status, action: callbackName
            }
        })
    }

    //load toasts.js if is not already!
    if ($("script[src='/assets/js/toasts.js']").length === 0) {
        $('body').append('<script src="/assets/js/toasts.js"></script>');
    }

    let handlers = {
        success: [], error: [], beforeSend: [], completed: []
    };

    let headers = {
        'x-local-api': 'true',
    };

    let customData = {};

    const spinnerButton = function (id, button) {
        // Add spinner icon to the button
        button.append(`<span id="${id}" class="spinner-border spinner-border-sm mx-2" role="status" aria-hidden="true"></span>`);
        // Disable the button to prevent multiple clicks
        button.addClass('disabled');
        return {
            originalHtml: button.html(), spinner: $(`#${id}`), button: button,
        };
    }

    const removeSpinnerButton = function (data) {
        setTimeout(function () {
            data.button.removeClass('disabled');
            data.spinner.remove();
        }, 1000);
    }

    const defaultErrorHandler = ({responseJSON: response}, buttonData, status) => {
        //handle permissions when status is 403 means user have no permission.
        if (status === 403) {
            toastMessageBottomCenter(`${response.page.title}: ${response.page.data.permission}`, 'error', toastTimer)
        } else if (response.message) {
            toastMessageBottomCenter(response.message, 'error', toastTimer)
        } else if (response.page) {
            toastMessageBottomCenter(response.page.title, 'error', toastTimer)
        } else {
            alert(response)
        }
        removeSpinnerButton(buttonData);
    };

    const defaultSuccessHandler = function (response, buttonData) {
        showToastMessage(response, buttonData)
    }


    const showToastMessage = function (response, buttonData) {
        if (response.message) {
            toastMessageBottomCenter(response.message, 'success')
        } else if (response.page) {
            toastMessageBottomCenter(response.page.title, 'success')
        } else {
            alert(response)
        }
        removeSpinnerButton(buttonData)
    }

    const setCookieNotification = function (value) {
        const date = new Date();
        date.setTime(date.getTime() + (8 * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        const name = 'notification'
        document.cookie = name + "=" + JSON.stringify(value) + ";" + expires + ";path=/";
    }

    $(document).on('click', '.ajax-handler', function (e) {
        e.preventDefault()
        const button = $(this);
        const formId = button.data('form-id');
        currentFormId = formId
        if (!formId) {
            alert('Missing data-form-id from the button!')
            return;
        }
        const form = $(`#${formId}`);

        if (!form.length) {
            alert(`Form with id ${formId} not found!`)
            return;
        }

        // Update CKEditor instances
        if ($('.textarea').length){
            $('.textarea').forEach(selector => {
                if ($(selector).length) {
                    for (const i in CKEDITOR.instances) {
                        CKEDITOR.instances[i].updateElement();
                    }
                }
            });
        }


        let formData;
        if (form[0] instanceof HTMLFormElement) {
            formData = new FormData(form[0]);
        } else {
            formData = new FormData();
        }
        console.log(formData)

        $(`#${formId} input`).removeClass('border border-danger');
        const buttonData = spinnerButton(`spinner-${formId}`, button);

        if (handlers.beforeSend.length > 0) {
            handlers.beforeSend.forEach(handler => handler(formData, form, buttonData, button, formId));
        }

        $.ajax({
            url: form.attr('action'),
            data: formData,
            method: form.attr('method'),
            processData: false,
            contentType: false,
            headers: headers,
            success: (response) => {
                logRequest(response, 200, 'success')
                if (handlers.success.length > 0) {
                    handlers.success.forEach(handler => handler(response, buttonData));
                } else {
                    defaultSuccessHandler(response, buttonData);
                }
            },
            error: (response) => {
                logRequest(response.responseText, response.status, 'error')
                if (handlers.error.length > 0) {
                    handlers.error.forEach(handler => handler(response, buttonData, response.status));
                } else {
                    defaultErrorHandler(response, buttonData, response.status);
                }
            },
            complete: () => {
                if (handlers.completed.length > 0) {
                    handlers.completed.forEach(handler => handler(buttonData));
                }
            }

        });
    });

    return {
        onSuccess: (callback) => {
            handlers.success.push(callback);
        }, onError: (callback) => {
            handlers.error.push(callback);
        }, onBeforeSend: (callback) => {
            handlers.beforeSend.push(callback);
        }, onCompleted: (callback) => {
            handlers.completed.push(callback);
        }, removeSpinnerButton(buttonData) {
            removeSpinnerButton(buttonData)
        },
        setToastTimer(time) {
            toastTimer = time
        },
        showToastMessage(response, buttonData){
            showToastMessage(response, buttonData)
        },
        redirect(response) {
            if (!response.url) {
                console.log('Response url is missing. In this case redirect is not allowed!')
                return;
            }

            if (response.message && response.message !== " ") {
                const message = response.message
                let alert_type = 'success'
                if (response.alert_type) {
                    alert_type = response.alert_type
                }
                const notification = {
                    'message': message, 'type': alert_type
                }
                setCookieNotification(notification)
            }
            if (response.url === window.location.pathname) {
                document.location.reload(true)
                return;
            }
            window.location.replace(response.url);
        }, getCurrentId() {
            return currentFormId;
        }
    };

})();
