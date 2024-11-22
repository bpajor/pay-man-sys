import xss from "xss";

export const sanitizeReturnProps = (data: any): any => {
    if (data instanceof Date || (!Array.isArray(data) && typeof data !== 'object')) {
        return xss(data);
    }

    if (Array.isArray(data)) {
        return data.map((item) => sanitizeReturnProps(item));
    }

    const sanitized_obj: Record<string, any> = {};

    Object.keys(data).forEach((key) => {
        const value = data[key];

        if (Array.isArray(value)) {
            sanitized_obj[key] = value.map((item) => sanitizeReturnProps(item));
        } else if (typeof value === 'object' && value !== null) {
            sanitized_obj[key] = sanitizeReturnProps(value);
        } else if (typeof value === 'string') {
            sanitized_obj[key] = xss(value);
        } else {
            sanitized_obj[key] = value;
        }
    });

    return sanitized_obj;
};
