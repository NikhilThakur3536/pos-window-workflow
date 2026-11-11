import React from 'react';

const MandatoryField = ({ parentFontSize = false, visibilityHidden = false }) => {
    return (
        <span
            className={`${parentFontSize ? '' : 'text-[18px]'} text-red-500 style={{ lineHeight: 1 }} ${visibilityHidden ? 'invisible' : ''}`}
        >
            *
        </span>
    );
};

export default MandatoryField;
