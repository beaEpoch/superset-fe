/* eslint-disable react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';

import SliceHeader from './SliceHeader';
import SliceFilter from './SliceFilter';
import ChartContainer from '../../chart/ChartContainer';

import '../../../stylesheets/dashboard.css';

const propTypes = {
  timeout: PropTypes.number,
  datasource: PropTypes.object,
  isLoading: PropTypes.bool,
  isCached: PropTypes.bool,
  cachedDttm: PropTypes.string,
  isExpanded: PropTypes.bool,
  widgetHeight: PropTypes.number,
  widgetWidth: PropTypes.number,
  slice: PropTypes.object,
  chartKey: PropTypes.string,
  formData: PropTypes.object,
  filters: PropTypes.object,
  forceRefresh: PropTypes.func,
  removeSlice: PropTypes.func,
  updateSliceName: PropTypes.func,
  toggleExpandSlice: PropTypes.func,
  exploreChart: PropTypes.func,
  exportCSV: PropTypes.func,
  runQuery: PropTypes.func,
  addFilter: PropTypes.func,
  getFilters: PropTypes.func,
  clearFilter: PropTypes.func,
  removeFilter: PropTypes.func,
  editMode: PropTypes.bool,
  annotationQuery: PropTypes.object,
};

const defaultProps = {
  forceRefresh: () => ({}),
  removeSlice: () => ({}),
  updateSliceName: () => ({}),
  toggleExpandSlice: () => ({}),
  exploreChart: () => ({}),
  exportCSV: () => ({}),
  runQuery: () => ({}),
  addFilter: () => ({}),
  getFilters: () => ({}),
  clearFilter: () => ({}),
  removeFilter: () => ({}),
  editMode: false,
};

class GridCell extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      value: [],
      filters: [],
      activeRequest: null,
    };

    const sliceId = this.props.slice.slice_id;
    this.addFilter = this.props.addFilter.bind(this, sliceId);
    this.getFilters = this.props.getFilters.bind(this, sliceId);
    this.clearFilter = this.props.clearFilter.bind(this, sliceId);
    this.removeFilter = this.props.removeFilter.bind(this, sliceId);
  }

  componentDidMount() {
    this.state.filters.forEach((filter, index) => this.fetchFilterValues(index));
  }

  getDescriptionId(slice) {
    return 'description_' + slice.slice_id;
  }

  getHeaderId(slice) {
    return 'header_' + slice.slice_id;
  }

  width() {
    return this.props.widgetWidth - 10;
  }

  height(slice) {
    const widgetHeight = this.props.widgetHeight;
    const headerHeight = this.headerHeight(slice);
    const descriptionId = this.getDescriptionId(slice);
    let descriptionHeight = 0;
    if (this.props.isExpanded && this.refs[descriptionId]) {
      descriptionHeight = this.refs[descriptionId].offsetHeight + 10;
    }

    return widgetHeight - headerHeight - descriptionHeight;
  }

  headerHeight(slice) {
    const headerId = this.getHeaderId(slice);
    return this.refs[headerId] ? this.refs[headerId].offsetHeight : 30;
  }

  fetchFilterValues(index, column) {
    const datasource = this.props.datasource;
    const col = column || this.state.value[index].col;
    const having = false;
    if (col && this.props.datasource && this.props.datasource.filter_select && !having) {
      this.setState((prevState) => {
        const newStateFilters = Object.assign([], prevState.filters);
        newStateFilters[index].valuesLoading = true;
        return { filters: newStateFilters };
      });
      // if there is an outstanding request to fetch values, cancel it.
      if (this.state.activeRequest) {
        this.state.activeRequest.abort();
      }
      this.setState({
        activeRequest: $.ajax({
          type: 'GET',
          url: `/superset/filter/${datasource.type}/${datasource.id}/${col}/`,
          success: (data) => {
            this.setState((prevState) => {
              const newStateFilters = Object.assign([], prevState.filters);
              newStateFilters[index] = { valuesLoading: false, valueChoices: data };
              return { filters: newStateFilters, activeRequest: null };
            });
          },
        }),
      });
    }
  }

  addSliceFilter() {
    const newFilters = Object.assign([], this.state.value);
    const col = this.props.datasource && this.props.datasource.filterable_cols.length > 0 ?
      this.props.datasource.filterable_cols[0][0] :
      null;
    newFilters.push({
      col,
      op: 'in',
      val: this.props.datasource.filter_select ? [] : '',
    });
    this.setState({
      value: Object.assign(this.state.value, newFilters),
    });
    const nextIndex = this.state.filters.length;
    this.setState((prevState) => {
      const newStateFilters = Object.assign([], prevState.filters);
      newStateFilters.push({ valuesLoading: false, valueChoices: [] });
      return { filters: newStateFilters };
    });
    this.fetchFilterValues(nextIndex, col);
  }

  changeSliceFilter(index, control, value) {
    const newFilters = Object.assign([], this.state.value);
    const modifiedFilter = Object.assign({}, newFilters[index]);
    if (typeof control === 'string') {
      modifiedFilter[control] = value;
    } else {
      control.forEach((c, i) => {
        modifiedFilter[c] = value[i];
      });
    }
    // Clear selected values and refresh upon column change
    if (control === 'col') {
      if (modifiedFilter.val.constructor === Array) {
        modifiedFilter.val = [];
      } else if (typeof modifiedFilter.val === 'string') {
        modifiedFilter.val = '';
      }
      this.fetchFilterValues(index, value);
    }
    newFilters.splice(index, 1, modifiedFilter);
    this.setState({
      value: Object.assign(this.state.value, newFilters),
    });
    this.setState((prevState) => {
      const newStateFilters = Object.assign(newFilters, prevState.filters);
      newStateFilters.push({ valuesLoading: false, valueChoices: [] });
      return { filters: newStateFilters };
    });
    const formData = { ...this.props.slice.formData };
    const newFormData = Object.assign(formData, { filters: this.state.value });
    this.props.runQuery(newFormData, true, this.props.timeout, this.props.chartKey);
  }

  removeSliceFilter(index) {
    const newValue = this.state.value.filter((f, i) => i !== index);
    this.setState({
      value: newValue,
    });
    this.setState((prevState) => {
      const newStateFilters = Object.assign([], prevState.filters);
      newStateFilters.splice(index, 1);
      return { filters: newStateFilters };
    });
    const formData = { ...this.props.slice.formData };
    const newFormData = Object.assign(formData, { filters: newValue });
    this.props.runQuery(newFormData, true, this.props.timeout, this.props.chartKey);
  }

  render() {
    const {
      isExpanded, isLoading, isCached, cachedDttm,
      removeSlice, updateSliceName, toggleExpandSlice, forceRefresh,
      chartKey, slice, datasource, formData, timeout, annotationQuery,
      exploreChart, exportCSV,
    } = this.props;
    const filters = this.state.value.map((filter, i) => (
      <div key={i}>
        <SliceFilter
          having={false}
          filter={filter}
          datasource={this.props.datasource}
          removeFilter={this.removeSliceFilter.bind(this, i)}
          changeFilter={this.changeSliceFilter.bind(this, i)}
          valuesLoading={this.state.filters[i].valuesLoading}
          valueChoices={this.state.filters[i].valueChoices}
        />
      </div>
    ));
    return (
      <div
        className={isLoading ? 'slice-cell-highlight' : 'slice-cell'}
        id={`${slice.slice_id}-cell`}
      >
        <div ref={this.getHeaderId(slice)}>
          <SliceHeader
            slice={slice}
            isExpanded={isExpanded}
            isCached={isCached}
            cachedDttm={cachedDttm}
            removeSlice={removeSlice}
            updateSliceName={updateSliceName}
            toggleExpandSlice={toggleExpandSlice}
            addSliceFilter={this.addSliceFilter.bind(this)}
            forceRefresh={forceRefresh}
            editMode={this.props.editMode}
            annotationQuery={annotationQuery}
            exploreChart={exploreChart}
            exportCSV={exportCSV}
          />
        </div>
        {
        /* This usage of dangerouslySetInnerHTML is safe since it is being used to render
           markdown that is sanitized with bleach. See:
             https://github.com/apache/incubator-superset/pull/4390
           and
             https://github.com/apache/incubator-superset/commit/b6fcc22d5a2cb7a5e92599ed5795a0169385a825 */}
        <div
          className="slice_description bs-callout bs-callout-default"
          style={isExpanded ? {} : { display: 'none' }}
          ref={this.getDescriptionId(slice)}
          dangerouslySetInnerHTML={{ __html: slice.description_markeddown }}
        />
        <div
          className="slice_description bs-callout bs-callout-default"
          style={this.state.value.length === 0 ? { display: 'none' } : {}}
        >
          {filters}
        </div>
        <div className="row chart-container">
          <input type="hidden" value="false" />
          <ChartContainer
            containerId={`slice-container-${slice.slice_id}`}
            chartKey={chartKey}
            datasource={datasource}
            formData={formData}
            headerHeight={this.headerHeight(slice)}
            height={this.height(slice)}
            width={this.width()}
            timeout={timeout}
            vizType={slice.formData.viz_type}
            addFilter={this.addFilter}
            getFilters={this.getFilters}
            clearFilter={this.clearFilter}
            removeFilter={this.removeFilter}
          />
        </div>
      </div>
    );
  }
}

GridCell.propTypes = propTypes;
GridCell.defaultProps = defaultProps;

export default GridCell;
