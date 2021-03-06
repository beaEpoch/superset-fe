import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Button, Row, Col } from 'react-bootstrap';
import { t } from '../../locales';
import SelectControl from '../../explore/components/controls/SelectControl';

const operatorsArr = [
  { val: 'in', type: 'array', useSelect: true, multi: true },
  { val: 'not in', type: 'array', useSelect: true, multi: true },
  { val: '==', type: 'string', useSelect: true, multi: false, havingOnly: true },
  { val: '!=', type: 'string', useSelect: true, multi: false, havingOnly: true },
  { val: '>=', type: 'string', havingOnly: true },
  { val: '<=', type: 'string', havingOnly: true },
  { val: '>', type: 'string', havingOnly: true },
  { val: '<', type: 'string', havingOnly: true },
  { val: 'regex', type: 'string', datasourceTypes: ['druid'] },
  { val: 'LIKE', type: 'string', datasourceTypes: ['table'] },
  { val: 'IS NULL', type: null },
  { val: 'IS NOT NULL', type: null },
];
const operators = {};
operatorsArr.forEach((op) => {
  operators[op.val] = op;
});

const propTypes = {
  changeFilter: PropTypes.func,
  removeFilter: PropTypes.func,
  filter: PropTypes.object.isRequired,
  datasource: PropTypes.object,
  editMode: PropTypes.bool,
  having: PropTypes.bool,
  valuesLoading: PropTypes.bool,
  valueChoices: PropTypes.array,
};

const defaultProps = {
  changeFilter: () => {},
  removeFilter: () => {},
  datasource: null,
  editMode: false,
  having: false,
  valuesLoading: false,
  valueChoices: [],
};

export default class SliceFilter extends React.Component {

  switchFilterValue(prevOp, nextOp) {
    if (operators[prevOp].type !== operators[nextOp].type) {
      // Switch from array to string or vice versa
      const val = this.props.filter.val;
      let newVal;
      if (operators[nextOp].type === 'string') {
        if (!val || !val.length) {
          newVal = '';
        } else {
          newVal = val[0];
        }
      } else if (operators[nextOp].type === 'array') {
        if (!val || !val.length) {
          newVal = [];
        } else {
          newVal = [val];
        }
      }
      this.props.changeFilter(['val', 'op'], [newVal, nextOp]);
    } else {
      // No value type change
      this.props.changeFilter('op', nextOp);
    }
  }

  changeText(event) {
    this.props.changeFilter('val', event.target.value);
  }

  changeSelect(value) {
    this.props.changeFilter('val', value);
  }

  changeColumn(event) {
    this.props.changeFilter('col', event.value);
  }

  changeOp(event) {
    this.switchFilterValue(this.props.filter.op, event.value);
  }

  removeFilter(filter) {
    this.props.removeFilter(filter);
  }

  renderFilterFormControl(filter) {
    const operator = operators[filter.op];
    if (operator.type === null) {
      // IS NULL or IS NOT NULL
      return null;
    }
    if (operator.useSelect && !this.props.having) {
      // TODO should use a simple Select, not a control here...
      return (
        <SelectControl
          multi={operator.multi}
          freeForm
          name="filter-value"
          value={filter.val}
          isLoading={this.props.valuesLoading}
          choices={this.props.valueChoices}
          onChange={this.changeSelect.bind(this)}
          showHeader={false}
        />
      );
    }
    return (
      <input
        type="text"
        onChange={this.changeText.bind(this)}
        value={filter.val || ''}
        className="form-control input-sm"
        placeholder={t('Filter value')}
      />
    );
  }
  render() {
    const datasource = this.props.datasource;
    const filter = this.props.filter;
    const opsChoices = operatorsArr
      .filter((o) => {
        if (this.props.having) {
          return !!o.havingOnly;
        }
        return (!o.datasourceTypes || o.datasourceTypes.indexOf(datasource.type) >= 0);
      })
      .map(o => ({ value: o.val, label: o.val }));
    let colChoices;
    if (datasource) {
      if (this.props.having) {
        colChoices = datasource.metrics_combo.map(c => ({ value: c[0], label: c[1] }));
      } else {
        colChoices = datasource.filterable_cols.map(c => ({ value: c[0], label: c[1] }));
      }
    }
    return (
      <div>
        {
          this.props.editMode ?
            <div>
              <Row className="space-1 slice-filter">
                <Col md={4}>
                  <Select
                    id="select-col"
                    placeholder={t('Select value')}
                    clearable={false}
                    options={colChoices}
                    value={filter.col}
                    onChange={this.changeColumn.bind(this)}
                  />
                </Col>
                <Col md={3}>
                  <Select
                    id="select-op"
                    placeholder={t('Select operator')}
                    options={opsChoices}
                    clearable={false}
                    value={filter.op}
                    onChange={this.changeOp.bind(this)}
                  />
                </Col>
                <Col md={4}>
                  {this.renderFilterFormControl(filter)}
                </Col>
                <Col md={1}>
                  <a onClick={this.removeFilter.bind(this)}><i className="fa fa-close" /></a>
                </Col>
              </Row>
            </div>
            :
            <div>
              <Row className="space-1 slice-filter">
                <Col md={4} style={{ textAlign: 'center' }}>
                  <label style={{ lineHeight: '30px' }}>{filter.col}:</label>
                </Col>
                <Col md={8}>
                  {this.renderFilterFormControl(filter)}
                </Col>
              </Row>
            </div>
        }
      </div>
    );
  }
}

SliceFilter.propTypes = propTypes;
SliceFilter.defaultProps = defaultProps;
