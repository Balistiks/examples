import ComparisonFlatSlider from '@widgets/comparison-flat-slider/ui';
import HeaderPage from '@widgets/header-page/ui';
import styles from './styles.module.scss';
import ComparisonFlatInfoBox from '@widgets/comparison-flat-info-box/ui';
import { get } from '@shared/i18n';
import { Apartment, Client } from '@tochka/api-ts';
import { useEffect, useState } from 'react';

const Comparisons = () => {
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const client = new Client();
    if (!client.restoreFromStorage()) {
        return console.log('no client');
    }

    const getData = async () => {
        const user = await client.getUser();
        const comparisons = await user.getSelectedApartments(
            'comparisons',
            client,
        );
        const apartments = [];
        for (let comparison of comparisons) {
            apartments.push(await Apartment.getById(comparison));
        }
        setData(apartments);
    };

    const onChange = (value) => {
        if (value == -1) {
            if (page != 1) {
                setPage(page - 1);
            }
        } else {
            if (Math.ceil(data.length / 3) >= page + 1) {
                setPage(page + 1);
            }
        }
    };

    useEffect(() => {
        getData();
    }, []);

    return (
        <>
            <HeaderPage title={get('comparisons')} />
            <div className={styles.ComparisonFlatSlider}>
                <ComparisonFlatSlider
                    page={page}
                    onChange={onChange}
                    apartments={data}
                />
            </div>
            <div>
                <ComparisonFlatInfoBox
                    apartments={data.slice(page * 3 - 3, page * 3)}
                />
            </div>
        </>
    );
};
export default Comparisons;
