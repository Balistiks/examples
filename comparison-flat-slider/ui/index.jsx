import ComparisonFlatCard from '@entities/comparison-flat-card/ui';
import { ComparisonAttributes, SliderButton } from '@shared/ui';
import { Col, Row } from 'antd';
import styles from './styles.module.scss';
import { useState } from 'react';

const ComparisonFlatInfo = (props) => {
    const onChange = (value) => {
        props.onChange(value);
    };

    return (
        <>
            <SliderButton onChange={onChange} />
            <Row gutter={10} className={styles.Row}>
                {props.apartments
                    .slice(props.page * 3 - 3, props.page * 3)
                    .map((apartment) => (
                        <Col key={apartment.id} span={7}>
                            <ComparisonFlatCard apartment={apartment} />
                        </Col>
                    ))}
            </Row>
        </>
    );
};
export default ComparisonFlatInfo;
